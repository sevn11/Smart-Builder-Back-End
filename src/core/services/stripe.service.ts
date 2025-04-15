import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { SignUpDTO } from "src/auth/validators";
import { AddUserDTO } from "src/company/validators";
import { DatabaseService } from "src/database/database.service";
import Stripe from "stripe";
import { BuilderPlanTypes } from "../utils/builder-plan-types";
import { UserTypes } from "../utils";
import { DemoUserDTO } from "src/admin/validators/add-demo-user";


@Injectable()
export class StripeService {
    private StripeClient: Stripe;
    private stripeTaxRateId: string;

    constructor(
        private readonly config: ConfigService,
        private databaseService: DatabaseService
    ) {
        this.StripeClient = new Stripe(config.get('STRIPE_API_KEY'))
        this.stripeTaxRateId = config.get('STRIPE_TAX_RATE_ID')
    }

    // Get stripe customer
    async getStripeCustomer(customerId: string) {
        try {
            if (!customerId) {
                return null;
            }
            let existingCustomer = await this.StripeClient.customers.retrieve(customerId);
            return existingCustomer || null;
        } catch (error) {
            console.log("Error fetching stripe customer", error)
            return null;
        }
    }

    // Create new subscription to builder for new employee
    async createEmployeeSubscription(builder: any, body: AddUserDTO) {
        try {
            let customer = await this.StripeClient.customers.retrieve(builder.stripeCustomerId);
            let builderSubscription = await this.StripeClient.subscriptions.retrieve(builder.subscriptionId);
            const planType = builder.company.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year'
            let feeAmount = parseFloat(builder.company.extraFee) * 100;
            if (planType === 'year') {
                feeAmount *= 12;
            }

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${builder.company.name}-${body.name}`
            });

            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: feeAmount,
                currency: 'usd',
                recurring: { interval: planType },
                product: product.id,
                tax_behavior: 'exclusive',
            });

            // Create a subscription for the new employee
            let subscription: Stripe.Subscription;
            const now = Math.floor(Date.now() / 1000);
            
            const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: customer.id,
                items: [{ price: price.id }],
                proration_behavior: 'none',
                default_tax_rates: [this.stripeTaxRateId],
            };
            if (builderSubscription.trial_end > now) {
                // Adding employee subscription within builder's trial period
                subscriptionPayload.trial_end = builderSubscription.trial_end;
                subscriptionPayload.proration_behavior = 'none';
            } else {
                // Adding employee subscription after builder's trial ended
                subscriptionPayload.billing_cycle_anchor = builderSubscription.current_period_end
                subscriptionPayload.proration_behavior = 'create_prorations';
            }

            let coupon: string;
            if(builder.isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }
            subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return { status: true, subscriptionId: subscription.id, productId: product.id, message: "Subscription added" };
        } catch (error) {
            console.error("Error creating subscription", error);
            return { status: false, message: error.raw.message };
        }
    }

    // Function to retieve default payment method of a builder
    async getDefaultPaymentMethod(customerId: string) {
        const customer = await this.StripeClient.customers.retrieve(customerId);
        if (customer.deleted !== true) {
            const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

            if (defaultPaymentMethodId) {
                return this.StripeClient.paymentMethods.retrieve(defaultPaymentMethodId as string);
            } else {
                return null;
            }
        }

    }

    // Function to set default payment method to a stripe customer
    async setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
        try {
            const attachedPaymentMethods = await this.StripeClient.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            const isPaymentMethodAttached = attachedPaymentMethods.data.some(pm => pm.id === paymentMethodId);
            // Attach the payment method if it's not already attached
            if (!isPaymentMethodAttached) {
                await this.StripeClient.paymentMethods.attach(paymentMethodId, { customer: customerId });
            }
            // Set the payment method as default to the customer
            await this.StripeClient.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });
            return { status: true };
        } catch (error) {
            return new InternalServerErrorException();
        }
    }

    // Update subscription amount
    async updateSubscriptionAmount(stripeCustomerId: string, user: User, newAmount: number, plantype: any) {
        try {
            let customer = await this.getStripeCustomer(stripeCustomerId);
            let subscription = await this.StripeClient.subscriptions.retrieve(user.subscriptionId);
            let productId = subscription.items.data[0].price.product;

            if (customer && subscription && productId) {
                // Create new price and attach it with current subscription product
                let newPrice = await this.StripeClient.prices.create({
                    unit_amount: newAmount,
                    currency: 'usd',
                    recurring: { interval: plantype },
                    product: productId as string,
                });
                if (newPrice.id) {
                    // Update new price in subscription
                    await this.StripeClient.subscriptions.update(user.subscriptionId, {
                        items: [{
                            id: subscription.items.data[0].id,
                            price: newPrice.id,
                        }],
                        proration_behavior: 'none'
                    });
                }
            }
            return;
        } catch (error) {
            console.log(error.message)
            return new InternalServerErrorException();
        }
    }

    // Function to remove subscription if employee is deleted
    async removeSubscription(subscriptionId: string) {
        try {
            let subscription = await this.StripeClient.subscriptions.retrieve(subscriptionId);
            if(subscription) {
                await this.StripeClient.subscriptions.cancel(subscriptionId);
                return true;
            }
            return false;
        } catch (error) {
            console.log(error)
            return false;
        }
    }

    // Function to remove a customer from stripe
    async deleteStripeCustomer(customerId: string) {
        try {
            let customer = await this.StripeClient.customers.retrieve(customerId);
            if(customer) {
                await this.StripeClient.customers.del(customerId);
                return true;
            }
            return false;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    // Function to retry a failed payment
    async retryFailedPayment(user: User, invoiceId: string, paymentMethodId: string) {
        try {
            const invoice = await this.StripeClient.invoices.retrieve(invoiceId);

            // Check if the invoice is already paid
            if (invoice.status === 'paid') {
                return { status: false, message: 'This invoice has already been paid' };
            }

            // Attach payment method
            await this.StripeClient.paymentMethods.attach(paymentMethodId, { customer: user.stripeCustomerId });
            // Try to pay invoice again
            await this.StripeClient.invoices.pay(invoiceId, {
                payment_method: paymentMethodId,
            });
            return { status: true, message: 'Payment successfull' }
        } catch (error) {
            console.log(error)
            return { status: false, message: error.raw.message };
        }
    }

    // Function to renew subscription for an employee
    async renewEmployeeSubscription(user: User, employee: any, paymentMethodId: string) {
        try {
            // Check current subscription canceled or not
            let existingSubscription = await this.StripeClient.subscriptions.retrieve(employee.subscriptionId);

            // Check if the invoice is already paid
            if (existingSubscription.status === 'active') {
                return { status: false, message: 'This subscription is active, Try refresh' };
            }

            // Attach payment method
            await this.StripeClient.paymentMethods.attach(paymentMethodId, { customer: user.stripeCustomerId });
            // Save payment method as default for future payements
            await this.StripeClient.customers.update(user.stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            const prices = await this.StripeClient.prices.list({
                product: employee.productId,
                active: true,
            });

            // Use the first active price (add more logic if needed)
            const activePriceId = prices.data[0].id;

            const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: user.stripeCustomerId,
                items: [{ price: activePriceId }],
                default_payment_method: paymentMethodId,
                default_tax_rates: [this.stripeTaxRateId],
            };
            let coupon: string;
            let subscription: Stripe.Subscription;
            if(user.isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }
            // Create new subscription for the employee
            subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return { status: true, subscriptionId: subscription.id, message: 'Subscription renewed' }
        } catch (error) {
            console.log("error", error)
            return { status: false, message: error.raw.message };
        }
    }

    // Function to create new subscription for builder
    async createBuilderSubscription(body: SignUpDTO, planAmount: number, promoCode?: string) {
        let customer: Stripe.Customer;
        try {
            const planType = body.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year'

            // Create new customer in stripe
            customer = await this.StripeClient.customers.create({
                name: body.name,
                email: body.email,
                address: {
                    line1: body.address,
                    country: 'US',
                    postal_code: body.zipcode
                },
            });
            // Attach payment method to customer
            await this.StripeClient.paymentMethods.attach(body.paymentMethodId, { customer: customer.id });

            // Set this payment method as the default for future invoices
            await this.StripeClient.customers.update(customer.id, {
                invoice_settings: {
                    default_payment_method: body.paymentMethodId,
                },
            });

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${body.companyName}-${body.name}`
            });

            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: planAmount * 100,
                currency: 'usd',
                recurring: { interval: planType },
                product: product.id,
                tax_behavior: 'exclusive'
            });
            const trialEndDate = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000);

            // Create a subscription for the new employee
            let subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: customer.id,
                items: [{ price: price.id }],
                default_payment_method: body.paymentMethodId,
                trial_end: trialEndDate,
                proration_behavior: 'none',
                default_tax_rates: [this.stripeTaxRateId],
            }
            if (promoCode) {
                subscriptionPayload.promotion_code = promoCode;
            }
            const subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);
            return {
                status: true,
                stripeCustomerId: customer.id,
                subscriptionId: subscription.id,
                productId: product.id,
                message: "Subscription added"
            }
        } catch (error) {
            console.log(error)
            if (customer) {
                // delete customer because payemnt failed
                await this.StripeClient.customers.del(customer.id);
            }
            return { status: false, message: error.raw.message ?? "Someting went wrong" };
        }
    }

    // Function to create new subscription for sign now
    async createBuilderSignNowSubscription(body: any, stripeCustomerId: string, planAmount: number, isDemoUser?: boolean) {
        try {
            const signNowPlanType = body.signNowPlanType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';
    
            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${body.companyName || body.name}-SignNow`
            });
    
            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: planAmount * 100,
                currency: 'usd',
                recurring: { interval: signNowPlanType },
                product: product.id,
            });
            const trialEndDate = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000);
    
            const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: stripeCustomerId,
                items: [{ price: price.id }],
                trial_end: trialEndDate,
                proration_behavior: 'none',
                default_tax_rates: [this.stripeTaxRateId],
            };

            // Apply coupon for demo builders
            let coupon: string;
            if(isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }
            // Create a subscription for sign-now
            const subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);
            return {
                status: true,
                stripeCustomerId: stripeCustomerId,
                subscriptionId: subscription.id,
                productId: product.id,
                message: "SignNow Subscription added"
            }
        }
        catch (error) {
            console.log(error);
            return {
                status: false,
                message: "Failed to create signnow subscription"
            }
        }
    }

    // Function to get sign now subscription status
    async getSignNowPlanStatus (subscriptionId: string) {
        try {
        let subInfo = await this.StripeClient.subscriptions.retrieve(subscriptionId);
        const currentDate = Math.floor(Date.now() / 1000);
        if(subInfo.current_period_end > currentDate) {
            return { status: true };
        } else {
            return { status: false };
        }
        } catch (error) {
            return { status: false };
        }
    }

    async isSignNowCancelled (subscriptionId: string) {
        try {
            let subInfo = await this.StripeClient.subscriptions.retrieve(subscriptionId);
            if(subInfo.status != 'canceled') {
                return { status: true };
            } else {
                return { status: false };
            }
        } catch (error) {
            return { status: false };
        }
    }

    // Function re create sign-now subscription
    async createBuilderSignNowSubscriptionAfterSignup(company: any, builder: any, signNowPlanAmount: number) {
        try {
            let existingSignNowSubscription = company.signNowSubscriptionId
                ? await this.StripeClient.subscriptions.retrieve(company.signNowSubscriptionId)
                : null;
            
            const planType = company.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';
            
            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${company.name}-SignNow`
            });

            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: signNowPlanAmount * 100,
                currency: 'usd',
                recurring: { interval: planType },
                product: product.id,
                tax_behavior: 'exclusive',
            });

            if(!existingSignNowSubscription) {
                let builderSubscription = await this.StripeClient.subscriptions.retrieve(builder.subscriptionId);
                let customer = await this.StripeClient.customers.retrieve(builder.stripeCustomerId);
                let subscription: Stripe.Subscription;
                const now = Math.floor(Date.now() / 1000);
                
                const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                    customer: customer.id,
                    items: [{ price: price.id }],
                    proration_behavior: 'none',
                    default_tax_rates: [this.stripeTaxRateId],
                };
                if (builderSubscription.trial_end > now) {
                    // Adding signnow subscription within builder's trial period
                    subscriptionPayload.trial_end = builderSubscription.trial_end;
                    subscriptionPayload.proration_behavior = 'none';
                } else {
                    // Adding signnow subscription after builder's current cycle ended
                    subscriptionPayload.billing_cycle_anchor = builderSubscription.current_period_end
                    subscriptionPayload.proration_behavior = 'create_prorations';
                }
                 // Apply coupon for demo builders
                let coupon: string;
                if(builder.isDemoUser) {
                    coupon = await this.createCoupon();
                    subscriptionPayload.coupon = coupon;
                }

                subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

                return { 
                    status: true,
                    message: "Subscription added", 
                    subscriptionId: subscription.id,
                    productId: product.id, 
                };
            }

            let prorationBehavious: Stripe.SubscriptionCreateParams.ProrationBehavior;
            let billingCycleAnchor: number;
            let trialEnd: number;
            if (existingSignNowSubscription.trial_end) {
                // Previous subscription was canceled on trial period
                trialEnd = existingSignNowSubscription.trial_end;
                prorationBehavious = 'none'; // no need proration since susbcription will start immediatly after trial ended.
            } else {
                // Previous subscription was canceled while plan was active
                billingCycleAnchor = existingSignNowSubscription.current_period_end;
                prorationBehavious = 'none';
            }

            const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: builder.stripeCustomerId,
                items: [{ price: price.id }],
                billing_cycle_anchor: billingCycleAnchor,
                proration_behavior: prorationBehavious,
                default_tax_rates: [this.stripeTaxRateId],
            };
    
            if (trialEnd) {
                subscriptionPayload.trial_end = trialEnd;
            }

            // Apply coupon for demo builders
            let coupon: string;
            if(builder.isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }

            // Create the new SignNow subscription
            const subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return { 
                status: true, message: "Subscription added", 
                subscriptionId: subscription.id,
                productId: product.id, 
            };
        } catch (error) {
            console.log(error);
            return { status: false, message: "Failed to add signnow subscription" };
        }
    }

    async changeSignNowSubscriptionPlanType (company: any, planAmount: number, planType: any) {
        try {
            let subscription = await this.StripeClient.subscriptions.retrieve(company.signNowSubscriptionId);
            const isTrialActive = subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000);

            // Create new price in stripe
            let newPrice = await this.StripeClient.prices.create({
                unit_amount: planAmount,
                currency: 'usd',
                recurring: { interval: planType },
                product: company.signNowStripeProductId,
            });

            const newPlanStartDate = isTrialActive ? subscription.trial_end : subscription.current_period_end;

            // Updating builder subscription / plan
            await this.StripeClient.subscriptions.update(company.signNowSubscriptionId,
                {
                    items: [{
                        id: subscription.items.data[0].id,
                        price: newPrice.id,
                    }],
                    trial_end: newPlanStartDate,
                    proration_behavior: 'none'
                }
            )
            return { status: true };
        } catch (error) {
            console.log("change plan error", error);
            return { status: false };
        }
    }

    // Function to create a coupon with 100% discount
    async createCoupon() {
        try {
            const coupon = await this.StripeClient.coupons.create({
                percent_off: 100,
                duration: 'forever',
            });
            return coupon.id;
        } catch (error) {
            console.error("Error creating coupon:", error.message);
            throw new Error("Failed to create discount coupon");
        }
    };


    // Function to create new subscription for demo user with 100% discount coupon
    async createDemoUserSubscription(body: DemoUserDTO, planAmount: number) {

        // Create the coupon
        const couponId = await this.createCoupon();

        let customer: Stripe.Customer;
        try {
            const planType = body.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year'

            // Create new customer in stripe
            customer = await this.StripeClient.customers.create({
                name: body.name,
                email: body.email
            });

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${body.companyName}-${body.name}`
            });

            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: planAmount * 100,
                currency: 'usd',
                recurring: { interval: planType },
                product: product.id,
            });
            const trialEndDate = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000);
            const trialEndDateObj = new Date(trialEndDate * 1000);

            const subscription = await this.StripeClient.subscriptions.create({
                customer: customer.id,
                items: [{ price: price.id }],
                trial_end: trialEndDate,
                coupon: couponId,

            });
            return {
                status: true,
                stripeCustomerId: customer.id,
                subscriptionId: subscription.id,
                productId: product.id,
                message: "Subscription added"
            }
        } catch (error) {
            if (customer) {
                // delete customer because payemnt failed
                await this.StripeClient.customers.del(customer.id);
            }
            return { status: false, message: error.raw.message ?? "Someting went wrong" };
        }
    }

    // Function to change user subscription/plan type
    async changeUserSubscriptionType(user: User, planAmount: number, planType: any, employee?: any) {
        try {
            let subscription = await this.StripeClient.subscriptions.retrieve(employee ? employee.subscriptionId : user.subscriptionId);
            const isTrialActive = subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000);

            // Create new price in stripe
            let newPrice = await this.StripeClient.prices.create({
                unit_amount: planAmount,
                currency: 'usd',
                recurring: { interval: planType },
                product: employee ? employee.productId : user.productId,
            });

            const newPlanStartDate = isTrialActive ? subscription.trial_end : subscription.current_period_end;

            // Updating builder subscription / plan
            await this.StripeClient.subscriptions.update(employee ? employee.subscriptionId : user.subscriptionId,
                {
                    items: [{
                        id: subscription.items.data[0].id,
                        price: newPrice.id,
                    }],
                    trial_end: newPlanStartDate,
                    proration_behavior: 'none'
                }
            )
            return { status: true };
        } catch (error) {
            console.log("change plan error", error)
            return { status: false };
        }
    }

    // Function to get builder subscription info
    async getBuilderSubscriptionInfo(user: User) {
        try {
            let subscription = await this.StripeClient.subscriptions.retrieve(user.subscriptionId);
            if (subscription) {
                const builderSubscription = {
                    subscription_status: subscription.status,
                    trial_end: subscription.trial_end,
                    current_period_start: subscription.current_period_start,
                    current_period_end: subscription.current_period_end
                };
                return { builderSubscription };
            } else {
                return null;
            }
        } catch (error) {
            return null
        }
    }

    // Function to update stripe customer 
    async updateCustomerEmail(user: User) {
        try {
            await this.StripeClient.customers.update(user.stripeCustomerId, {
                email: user.email,
                name: user.name
            });
        } catch (error) {
            console.log(error)
            return false;
        }
    }

    // Function to get promo code information
    async getPromoCodeInfo (promo_code: string) {
        try {
            const promotionCodes = await this.StripeClient.promotionCodes.list({
                limit: 100,
                code: promo_code
            });
            let promoCodeInfo = promotionCodes.data[0];
            if (!promoCodeInfo || !promoCodeInfo.coupon.valid) {
                return {
                    status: false,
                    info: null,
                    message: "Promo code is expired or invalid",
                };
            }
            const coupon = promoCodeInfo.coupon;

            let discountInfo: any;
            if (coupon.percent_off) {
                discountInfo = { type: "percentage", value: coupon.percent_off };
            } else if (coupon.amount_off) {
                discountInfo = { type: "fixed", value: coupon.amount_off / 100 };
            } else {
                return {
                    status: false,
                    info: null,
                    message: "No valid discount found for this promo code",
                };
            }

            return {
                status: true,
                info: {
                    promo_code_id: promoCodeInfo.id,
                    coupon_id: coupon.id,
                    name: coupon.name || "Promo Code",
                    discount: discountInfo,
                    duration: coupon.duration,
                },
                message: "Promo code applied successfully",
            };
        } catch (error) {
            console.log(error)
            return {
                status: false,
                info: null,
                message: "Invalid promo code"
            }
        }
    }
}