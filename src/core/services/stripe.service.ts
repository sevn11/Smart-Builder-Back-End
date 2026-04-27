import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { SignUpDTO } from "src/auth/validators";
import { AddUserDTO } from "src/company/validators";
import { ActivateSubscriptionDTO } from "src/company/validators/activate-subscription";
import { DatabaseService } from "src/database/database.service";
import Stripe from "stripe";
import { BuilderPlanTypes } from "../utils/builder-plan-types";
import { UserTypes } from "../utils";
import { DemoUserDTO } from "src/admin/validators/add-demo-user";
import { PlanType } from "src/company/validators/activate-subscription";

@Injectable()
export class StripeService {
    private StripeClient: Stripe;
    private stripeTaxRateId: string;

    constructor(
        private readonly config: ConfigService,
        private databaseService: DatabaseService,
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
                automatic_tax: { enabled: true },
                trial_settings: {
                    end_behavior: { missing_payment_method: 'pause' },
                },
            };
            if (builderSubscription.trial_end && builderSubscription.trial_end > now) {
                // Adding employee subscription within builder's trial period
                subscriptionPayload.trial_end = builderSubscription.trial_end;
                subscriptionPayload.proration_behavior = 'none';
            } else {
                // Adding employee subscription after builder's trial ended
                subscriptionPayload.billing_cycle_anchor = builderSubscription.current_period_end
                subscriptionPayload.proration_behavior = 'create_prorations';
            }

            let coupon: string;
            if (builder.isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }
            subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return { status: true, subscriptionId: subscription.id, productId: product.id, message: "Subscription added" };
        } catch (error) {
            console.error("Error creating subscription", error);
            return { status: false, message: error.message };
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

    // Function to detach (delete) default payment method from a stripe customer
    async deleteDefaultPaymentMethod(customerId: string) {
        try {
            const customer = await this.StripeClient.customers.retrieve(customerId);
            if (customer.deleted !== true) {
                const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;
                if (defaultPaymentMethodId) {
                    await this.StripeClient.paymentMethods.detach(defaultPaymentMethodId as string);
                }
            }
            return { status: true };
        } catch (error) {
            console.log("Error deleting default payment method", error);
            return { status: false, message: error.message };
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
            console.log('error', error.message)
            return new InternalServerErrorException();
        }
    }

    // Function to remove subscription if employee is deleted
    async removeSubscription(subscriptionId: string) {
        try {
            let subscription = await this.StripeClient.subscriptions.retrieve(subscriptionId);
            if (subscription) {
                await this.StripeClient.subscriptions.cancel(subscriptionId);
                return true;
            }
            return false;
        } catch (error) {
            console.log('error', error)
            return false;
        }
    }

    // Function to remove a customer from stripe
    async deleteStripeCustomer(customerId: string) {
        try {
            let customer = await this.StripeClient.customers.retrieve(customerId);
            if (customer) {
                await this.StripeClient.customers.del(customerId);
                return true;
            }
            return false;
        } catch (error) {
            console.log('error', error);
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
            console.log('error', error)
            return { status: false, message: error.message };
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
                automatic_tax: { enabled: true },
            };
            let coupon: string;
            let subscription: Stripe.Subscription;
            if (user.isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }
            // Create new subscription for the employee
            subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return { status: true, subscriptionId: subscription.id, message: 'Subscription renewed' }
        } catch (error) {
            console.log("error", error)
            return { status: false, message: error.message };
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
                tax: {
                    validate_location: 'immediately',
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
                automatic_tax: { enabled: true },
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
            console.log('error', error)
            if (customer) {
                // delete customer because payemnt failed
                await this.StripeClient.customers.del(customer.id);
            }
            return { status: false, message: error.message ?? "Someting went wrong" };
        }
    }

    // Function to create new subscription for sign now
    async createBuilderSignNowSubscription(body: any, stripeCustomerId: string, planAmount: number, isDemoUser?: boolean, subscriptionId?: string) {
        try {
            const signNowPlanType = body.signNowPlanType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${body.companyName || body.name}-SignHere`
            });

            let builderSubDetails = await this.StripeClient.subscriptions.retrieve(subscriptionId);

            if (!builderSubDetails) {
                return;
            }


            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: planAmount * 100,
                currency: 'usd',
                recurring: { interval: signNowPlanType },
                product: product.id,
            });
            const now = Math.floor(Date.now() / 1000);

            const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: stripeCustomerId,
                items: [{ price: price.id }],
                payment_behavior: 'default_incomplete',
                proration_behavior: 'none',
                automatic_tax: { enabled: true },
                trial_settings: {
                    end_behavior: {
                        missing_payment_method: 'pause',
                    },
                },
            };

            if (builderSubDetails.trial_end && builderSubDetails.trial_end > now) {
                subscriptionPayload.trial_end = builderSubDetails.trial_end;
            } else {
                subscriptionPayload.billing_cycle_anchor = builderSubDetails.current_period_end;
                subscriptionPayload.proration_behavior = 'create_prorations';
            }

            // Apply coupon for demo builders
            let coupon: string;
            if (isDemoUser) {
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
                message: "SignHere Subscription added"
            }
        }
        catch (error) {
            console.log('error', error);
            return {
                status: false,
                message: error?.message ?? "Failed to create SignHere subscription"
            }
        }
    }

    // Function to get sign now subscription status
    async getSignNowPlanStatus(subscriptionId: string) {
        try {
            let subInfo = await this.StripeClient.subscriptions.retrieve(subscriptionId);
            const currentDate = Math.floor(Date.now() / 1000);
            if (subInfo.current_period_end > currentDate) {
                return { status: true };
            } else {
                return { status: false };
            }
        } catch (error) {
            return { status: false };
        }
    }

    async isSignNowCancelled(subscriptionId: string) {
        try {
            let subInfo = await this.StripeClient.subscriptions.retrieve(subscriptionId);
            if (subInfo.status != 'canceled') {
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
            let existingSignNowSubscription = null;
            try {
                if (company.signNowSubscriptionId) {
                    existingSignNowSubscription = await this.StripeClient.subscriptions.retrieve(company.signNowSubscriptionId);
                }
            } catch (error) {
                console.warn(`Unable to retrieve existing SignHere subscription for company ${company.id}: ${error}`);
                existingSignNowSubscription = null;
            }

            const planType = company.planType == BuilderPlanTypes.MONTHLY ? 'month' : 'year';

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${company.name}-SignHere`
            });

            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: signNowPlanAmount * 100,
                currency: 'usd',
                recurring: { interval: planType },
                product: product.id,
                tax_behavior: 'exclusive',
            });

            if (!existingSignNowSubscription) {
                let builderSubscription = await this.StripeClient.subscriptions.retrieve(builder.subscriptionId);
                let customer = await this.StripeClient.customers.retrieve(builder.stripeCustomerId);
                let subscription: Stripe.Subscription;
                const now = Math.floor(Date.now() / 1000);

                const subscriptionPayload: Stripe.SubscriptionCreateParams = {
                    customer: customer.id,
                    items: [{ price: price.id }],
                    proration_behavior: 'none',
                    automatic_tax: { enabled: true },
                    trial_settings: {
                        end_behavior: { missing_payment_method: 'pause' },
                    },
                };
                if (builderSubscription.trial_end && builderSubscription.trial_end > now) {
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
                if (builder.isDemoUser) {
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
                automatic_tax: { enabled: true },
                trial_settings: {
                    end_behavior: { missing_payment_method: 'pause' },
                },
            };

            if (trialEnd) {
                subscriptionPayload.trial_end = trialEnd;
            }

            // Apply coupon for demo builders
            let coupon: string;
            if (builder.isDemoUser) {
                coupon = await this.createCoupon();
                subscriptionPayload.coupon = coupon;
            }

            // Create the new SignHere subscription
            const subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return {
                status: true, message: "Subscription added",
                subscriptionId: subscription.id,
                productId: product.id,
            };
        } catch (error) {
            console.log('error', error);
            return { status: false, message: "Failed to add SignHere subscription" };
        }
    }

    async changeSignNowSubscriptionPlanType(company: any, planAmount: number, planType: any) {
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

            // Updating SignHere subscription / plan
            await this.StripeClient.subscriptions.update(company.signNowSubscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPrice.id,
                }],
                trial_end: newPlanStartDate,
                proration_behavior: 'none',
            });
            return { status: true };
        } catch (error) {
            console.log("change plan error :- ", error);
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
                email: body.email,
                address: {
                    line1: body.address,
                    country: 'US',
                    postal_code: body.zipcode
                },
                tax: {
                    validate_location: 'immediately',
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
            });
            const trialEndDate = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000);

            const subscription = await this.StripeClient.subscriptions.create({
                customer: customer.id,
                items: [{ price: price.id }],
                trial_end: trialEndDate,
                coupon: couponId,
                automatic_tax: { enabled: true },
                // When trial ends, create a $0 invoice (covered by 100% coupon) and auto-pay it.
                // This transitions the subscription to active without requiring a payment method.
                trial_settings: {
                    end_behavior: {
                        missing_payment_method: 'create_invoice',
                    },
                },
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
            const updatedSub = await this.StripeClient.subscriptions.update(employee ? employee.subscriptionId : user.subscriptionId, {
                items: [{
                    id: subscription.items.data[0].id,
                    price: newPrice.id,
                }],
                trial_end: newPlanStartDate,
                proration_behavior: 'none',
            });
            return { status: true, current_period_start: updatedSub.current_period_start, current_period_end: updatedSub.current_period_end };
        } catch (error) {
            console.log("change plan error", error)
            return { status: false };
        }
    }

    // Function to get builder subscription info
    async getBuilderSubscriptionInfo(user: Pick<User, 'subscriptionId'>) {
        try {
            let subscription = await this.StripeClient.subscriptions.retrieve(user.subscriptionId, {
                expand: ['default_payment_method']
            });
            if (subscription) {
                const builderSubscription = {
                    subscription_status: subscription.status,
                    trial_end: subscription.trial_end,
                    current_period_start: subscription.current_period_start,
                    current_period_end: subscription.current_period_end,
                    has_payment_method: !!subscription.default_payment_method,
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
            console.log('error', error)
            return false;
        }
    }

    // Pause a Stripe subscription (void invoices during pause)
    async pauseSubscription(subscriptionId: string) {
        try {
            await this.StripeClient.subscriptions.update(subscriptionId, {
                pause_collection: { behavior: 'void' },
            });
            console.log('Stripe subscription paused:', subscriptionId);
            return { status: true };
        } catch (error: any) {
            console.error('Failed to pause Stripe subscription:', error);
            return { status: false, message: error?.message ?? 'Failed to pause subscription' };
        }
    }

    // Resume a paused Stripe subscription with a payment method
    async resumeSubscription(subscriptionId: string, paymentMethodId: string) {
        try {
            const subscription = await this.StripeClient.subscriptions.retrieve(subscriptionId);

            if (subscription.status === 'paused') {
                // Subscription paused by Stripe (e.g. trial ended with no payment method)
                await this.StripeClient.subscriptions.resume(subscriptionId, {
                    billing_cycle_anchor: 'now',
                });
                await this.StripeClient.subscriptions.update(subscriptionId, {
                    default_payment_method: paymentMethodId,
                });
            } else {
                // Subscription paused via pause_collection
                await this.StripeClient.subscriptions.update(subscriptionId, {
                    pause_collection: null,
                    default_payment_method: paymentMethodId,
                } as any);
            }

            console.log('Stripe subscription resumed:', subscriptionId);
            return { status: true };
        } catch (error) {
            console.error('Failed to resume Stripe subscription:', error);
            return { status: false, message: error?.message ?? 'Failed to resume subscription' };
        }
    }

    // Create Stripe customer + trial subscription (no payment method required)
    async createTrialSubscription(email: string, name: string, phone?: string, planAmount?: number, body?: any, promoCode?: string) {
        let customer: Stripe.Customer;

        try {
            let yearlyAmount: number;
            if (planAmount !== undefined) {
                yearlyAmount = Math.round(planAmount * 100); // convert to cents
            } else {
                // Fallback: get yearly plan amount from DB
                const seoSettings = await this.databaseService.seoSettings.findFirst();
                if (!seoSettings || !seoSettings.yearlyPlanAmount) {
                    console.error('seo_settings not found or yearlyPlanAmount is missing');
                    return { status: false, message: 'Plan pricing not configured in DB' };
                }
                yearlyAmount = Math.round(Number(seoSettings.yearlyPlanAmount) * 100);
            }

            customer = await this.StripeClient.customers.create({
                email,
                name,
                phone: phone || undefined,
                metadata: {
                    referralCode: body?.referralCode || '',
                },
                address: {
                    line1: body?.address || '',
                    country: 'US',
                    postal_code: body?.zipcode,
                },
                tax: {
                    validate_location: 'immediately',
                }
            });

            let productId: string;

            const product = await this.StripeClient.products.create({
                name: `${body.companyName}-${name}`
            });

            productId = product.id;

            const trialEndDate = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000);

            let subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: customer.id,
                items: [{
                    price_data: {
                        currency: 'usd',
                        product: productId,
                        unit_amount: yearlyAmount,
                        recurring: {
                            interval: 'year',
                        },
                    },
                }],
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                automatic_tax: { enabled: true },
                trial_settings: {
                    end_behavior: {
                        missing_payment_method: 'pause',
                    },
                },
                trial_end: trialEndDate,
            };

            const subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return {
                status: true,
                stripeCustomerId: customer.id,
                subscriptionId: subscription.id,
                productId: productId,
                trialEndsAt: new Date(trialEndDate * 1000),
            };
        } catch (error) {
            if (customer) {
                try {
                    await this.StripeClient.customers.del(customer.id);
                } catch (cleanupError) {
                    console.error('Failed to cleanup Stripe customer:', cleanupError);
                }
            }
            return { status: false, message: error?.message ?? 'Stripe subscription creation failed' };
        }
    }

    async createTrialBuilderSignNowSubscription(company: any, bodyName: string, stripeCustomerId: any, signNowPlanAmount: number, trialEndsAt?: Date) {
        try {

            let yearlyAmount: number;

            yearlyAmount = Math.round(Number(signNowPlanAmount) * 100);

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${company.companyName}-${bodyName}-SignHere`
            });

            const productId = product.id;

            let subscriptionPayload: Stripe.SubscriptionCreateParams = {
                customer: stripeCustomerId,
                items: [{
                    price_data: {
                        currency: 'usd',
                        product: productId,
                        unit_amount: yearlyAmount,
                        recurring: {
                            interval: 'year',
                        },
                    },
                }],
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                automatic_tax: { enabled: true },
                trial_settings: {
                    end_behavior: {
                        missing_payment_method: 'pause',
                    },
                },
                trial_end: trialEndsAt
                    ? Math.floor(trialEndsAt.getTime() / 1000)
                    : Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
            };

            const subscription = await this.StripeClient.subscriptions.create(subscriptionPayload);

            return {
                status: true,
                stripeCustomerId: stripeCustomerId,
                subscriptionId: subscription.id,
                productId: productId,
            };
        }
        catch (error) {
            return { status: false, message: error?.message ?? 'Stripe subscription creation failed' };
        }
    }

    // Function to get promo code information
    async getPromoCodeInfo(promo_code: string) {
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
            console.log('error', error)
            return {
                status: false,
                info: null,
                message: "Invalid promo code"
            }
        }
    }

    async activateSubscription(
        user: User,
        body: ActivateSubscriptionDTO,
        signNowSubscriptionId: string,
        planAmount: number,
        signNowPlanAmount: number,
    ) {
        try {

            // Demo users have a 100% forever coupon — their subscription auto-activates when
            // the trial ends via a $0 invoice. They cannot be paused, resumed, or cancelled.
            if (user.isDemoUser) {
                return {
                    status: true,
                    subscriptionId: user.subscriptionId,
                    productId: user.productId,
                    signHereSubscriptionId: signNowSubscriptionId,
                    signHereProductId: null,
                    isNewSubscription: false,
                };
            }

            if (!body?.paymentMethodId) {
                throw new Error('Payment method is required');
            }

            const customerId = user.stripeCustomerId;
            const paymentMethodId = body.paymentMethodId;
            const promoCode = body.promoCode;
            const planType = body.planType === PlanType.MONTHLY ? 'month' : 'year';

            // Attach payment method to customer
            try {
                await this.StripeClient.paymentMethods.attach(paymentMethodId, {
                    customer: customerId,
                });
            } catch (error: any) {
                const msg = error?.message?.toLowerCase() || '';
                const alreadyAttached =
                    msg.includes('already attached') ||
                    msg.includes('previously used') ||
                    error?.code === 'resource_already_exists';
                if (!alreadyAttached) {
                    throw error;
                }
            }

            await this.StripeClient.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            // Check current subscription status to decide: resume paused OR create new
            let mainSubscription: Stripe.Subscription | null = null;
            let subscriptionStatus: string | null = null;

            if (user.subscriptionId) {
                try {
                    mainSubscription = await this.StripeClient.subscriptions.retrieve(user.subscriptionId);
                    subscriptionStatus = mainSubscription.status;
                } catch (error) {
                    // Subscription not found in Stripe (deleted or invalid)
                    mainSubscription = null;
                    subscriptionStatus = null;
                }
            }

            let resultSubscriptionId = user.subscriptionId;
            let resultProductId = user.productId;

            if (subscriptionStatus === 'paused') {

                // Apply discounts BEFORE resuming so Stripe includes them in the invoice it creates on resume
                if (promoCode) {
                    await this.StripeClient.subscriptions.update(user.subscriptionId, {
                        discounts: [{ promotion_code: promoCode }],
                    });
                }

                // Resume — Stripe creates a new invoice that will include the discount applied above
                await this.StripeClient.subscriptions.resume(user.subscriptionId, {
                    billing_cycle_anchor: 'now',
                });

                // Pay the latest invoice immediately
                const subscription = await this.StripeClient.subscriptions.retrieve(
                    user.subscriptionId,
                    { expand: ['latest_invoice'] }
                );
                let latestInvoice = subscription.latest_invoice as Stripe.Invoice;
                // Stripe may create the invoice as draft on resume — finalize it first so it becomes open
                if (latestInvoice && latestInvoice.status === 'draft') {
                    latestInvoice = await this.StripeClient.invoices.finalizeInvoice(latestInvoice.id);
                }
                if (latestInvoice && latestInvoice.status === 'open') {
                    try {
                        await this.StripeClient.invoices.pay(latestInvoice.id, {
                            payment_method: paymentMethodId,
                        });
                        console.log('Invoice paid:', latestInvoice.id);
                    } catch (payError) {
                        // Payment failed — re-pause to rollback the resume so Stripe stays consistent with DB
                        await this.StripeClient.subscriptions.update(user.subscriptionId, {
                            pause_collection: { behavior: 'mark_uncollectible' },
                        });
                        throw payError;
                    }
                }

                // Re-fetch and confirm the subscription is genuinely active before writing the DB.
                // Catches: 3DS requires_action, async declines, and any state where invoices.pay
                // resolved but the invoice did not actually settle (sub stays past_due / open).
                const confirmedResume = await this.StripeClient.subscriptions.retrieve(user.subscriptionId);

                const isResumeActive =
                    confirmedResume.status === 'active' || confirmedResume.status === 'trialing';

                if (!isResumeActive) {
                    // Roll back: re-pause so Stripe and DB stay consistent, then surface the error.
                    const t = await this.StripeClient.subscriptions.update(user.subscriptionId, {
                        pause_collection: { behavior: 'mark_uncollectible' },
                    });

                    throw new InternalServerErrorException(
                        'Payment did not complete — subscription is past_due. Please try again with a different card.'
                    );
                }

                // Directly update DB — do not rely solely on webhook for cardOnFile/accountStatus
                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        cardOnFile: true,
                        accountStatus: 'active',
                        ...(promoCode && { referralCodeApplied: true }),
                    },
                });

                // Also resume SignHere subscription if paused
                if (signNowSubscriptionId) {
                    try {
                        const signNowSub = await this.StripeClient.subscriptions.retrieve(signNowSubscriptionId);

                        if (signNowSub.status === 'paused') {
                            await this.StripeClient.subscriptions.resume(signNowSubscriptionId, {
                                billing_cycle_anchor: 'now',
                            });
                            const resumedSub = await this.StripeClient.subscriptions.retrieve(
                                signNowSubscriptionId,
                                { expand: ['latest_invoice'] }
                            );
                            let latestInvoice = resumedSub.latest_invoice as Stripe.Invoice;
                            if (latestInvoice && latestInvoice.status === 'draft') {
                                latestInvoice = await this.StripeClient.invoices.finalizeInvoice(latestInvoice.id);
                            }
                            if (latestInvoice && latestInvoice.status === 'open') {
                                await this.StripeClient.invoices.pay(latestInvoice.id, {
                                    payment_method: paymentMethodId,
                                });
                            }
                        } else if (signNowSub.status === 'incomplete') {
                            // Cannot resume — pay the open invoice directly to activate
                            const incompleteSub = await this.StripeClient.subscriptions.retrieve(
                                signNowSubscriptionId,
                                { expand: ['latest_invoice'] }
                            );
                            let latestInvoice = incompleteSub.latest_invoice as Stripe.Invoice;
                            if (latestInvoice && latestInvoice.status === 'draft') {
                                latestInvoice = await this.StripeClient.invoices.finalizeInvoice(latestInvoice.id);
                            }
                            if (latestInvoice && latestInvoice.status === 'open') {
                                await this.StripeClient.invoices.pay(latestInvoice.id, {
                                    payment_method: paymentMethodId,
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Failed to resume SignHere subscription:', error);
                    }
                }

                // Resume all paused employee subscriptions, update payment method, and pay outstanding invoices
                if (user.companyId) {
                    const employees = await this.databaseService.user.findMany({
                        where: {
                            companyId: user.companyId,
                            userType: UserTypes.EMPLOYEE,
                            isDeleted: false,
                        },
                        select: { id: true, subscriptionId: true },
                    });

                    for (const employee of employees) {
                        if (employee.subscriptionId) {
                            try {
                                const empSub = await this.StripeClient.subscriptions.retrieve(
                                    employee.subscriptionId,
                                    { expand: ['latest_invoice'] }
                                );
                                if (empSub.status === 'paused') {
                                    await this.StripeClient.subscriptions.update(employee.subscriptionId, {
                                        default_payment_method: paymentMethodId,
                                    });
                                    await this.StripeClient.subscriptions.resume(employee.subscriptionId, {
                                        billing_cycle_anchor: 'now',
                                    });
                                    const resumedEmpSub = await this.StripeClient.subscriptions.retrieve(
                                        employee.subscriptionId,
                                        { expand: ['latest_invoice'] }
                                    );
                                    let empInvoice = resumedEmpSub.latest_invoice as Stripe.Invoice;
                                    if (empInvoice && empInvoice.status === 'draft') {
                                        empInvoice = await this.StripeClient.invoices.finalizeInvoice(empInvoice.id);
                                    }
                                    if (empInvoice && empInvoice.status === 'open') {
                                        await this.StripeClient.invoices.pay(empInvoice.id, {
                                            payment_method: paymentMethodId,
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error(`Failed to resume employee subscription ${employee.subscriptionId}:`, error);
                            }
                        }
                    }

                    await this.databaseService.user.updateMany({
                        where: {
                            companyId: user.companyId,
                            userType: UserTypes.EMPLOYEE,
                            isDeleted: false,
                        },
                        data: { accountStatus: 'active' },
                    });
                }

            } else if (!mainSubscription || subscriptionStatus === 'canceled' || subscriptionStatus === 'incomplete_expired') {
                // CANCELED or NO subscription → Create a brand new subscription
                const amountInCents = Math.round(planAmount * 100);

                // Create new product
                const customer = await this.StripeClient.customers.retrieve(customerId) as Stripe.Customer;
                const product = await this.StripeClient.products.create({
                    name: `${customer.name || user.email}-Reactivation`,
                });
                // Create price for the product
                const price = await this.StripeClient.prices.create({
                    unit_amount: amountInCents,
                    currency: 'usd',
                    recurring: { interval: planType as Stripe.PriceCreateParams.Recurring.Interval },
                    product: product.id,
                    tax_behavior: 'exclusive',
                });


                let subscriptionPayload: Stripe.SubscriptionCreateParams = {
                    customer: customerId,
                    items: [{
                        price: price.id,
                    }],
                    default_payment_method: paymentMethodId,
                    payment_behavior: 'default_incomplete',
                    payment_settings: {
                        save_default_payment_method: 'on_subscription',
                        payment_method_types: ['card'],
                    },
                    proration_behavior: 'none',
                    automatic_tax: { enabled: true },
                    expand: ['latest_invoice'],
                };

                if (promoCode) {
                    subscriptionPayload.discounts = [
                        { promotion_code: promoCode },
                    ];
                }

                const newSubscription = await this.StripeClient.subscriptions.create(subscriptionPayload);
                resultSubscriptionId = newSubscription.id;
                resultProductId = product.id;

                // Finalize and pay the first invoice — mirrors the resume branch above.
                // Without this the subscription stays in `incomplete` and the open invoice is never charged,
                // even though Stripe has the payment method on file.
                try {
                    let latestInvoice = newSubscription.latest_invoice as Stripe.Invoice;
                    if (latestInvoice && latestInvoice.status === 'draft') {
                        latestInvoice = await this.StripeClient.invoices.finalizeInvoice(latestInvoice.id);
                    }
                    if (latestInvoice && latestInvoice.status === 'open') {
                        await this.StripeClient.invoices.pay(latestInvoice.id, {
                            payment_method: paymentMethodId,
                        });
                    }
                } catch (payError) {
                    // Payment failed — cancel the orphaned Stripe subscription so a retry starts cleanly.
                    await this.StripeClient.subscriptions.cancel(newSubscription.id);
                    throw payError;
                }

                // Re-fetch to confirm Stripe moved the subscription to active before we trust the DB write.
                const confirmedSub = await this.StripeClient.subscriptions.retrieve(newSubscription.id);
                const isConfirmedActive =
                    confirmedSub.status === 'active' || confirmedSub.status === 'trialing';

                if (!isConfirmedActive) {
                    await this.StripeClient.subscriptions.cancel(newSubscription.id);
                    throw new InternalServerErrorException(
                        'Payment did not complete — subscription is incomplete. Please try again with a different card.'
                    );
                }

                try {
                    await this.databaseService.user.update({
                        where: { id: user.id },
                        data: {
                            subscriptionId: newSubscription.id,
                            productId: product.id,
                            cardOnFile: true,
                            accountStatus: 'active',
                            ...(promoCode && { referralCodeApplied: true }),
                        },
                    });
                } catch (dbError) {
                    // DB failed — cancel the Stripe subscription to prevent an orphaned live subscription
                    await this.StripeClient.subscriptions.cancel(newSubscription.id);
                    throw dbError;
                }

                // Also create new SignHere subscription
                if (signNowPlanAmount > 0) {
                    try {
                        const signNowProduct = await this.StripeClient.products.create({
                            name: `${customer.name || user.email}-SignHere-Reactivation`,
                        });

                        const signNowPrice = await this.StripeClient.prices.create({
                            unit_amount: Math.round(signNowPlanAmount * 100),
                            currency: 'usd',
                            recurring: { interval: planType as Stripe.PriceCreateParams.Recurring.Interval },
                            product: signNowProduct.id,
                        });

                        const signNowSub = await this.StripeClient.subscriptions.create({
                            customer: customerId,
                            items: [{ price: signNowPrice.id }],
                            default_payment_method: paymentMethodId,
                            payment_behavior: 'default_incomplete',
                            payment_settings: {
                                save_default_payment_method: 'on_subscription',
                                payment_method_types: ['card'],
                            },
                            proration_behavior: 'none',
                            automatic_tax: { enabled: true },
                            expand: ['latest_invoice'],
                        });

                        // Pay the first SignHere invoice so the sub leaves `incomplete`.
                        let signNowInvoice = signNowSub.latest_invoice as Stripe.Invoice;
                        if (signNowInvoice && signNowInvoice.status === 'draft') {
                            signNowInvoice = await this.StripeClient.invoices.finalizeInvoice(signNowInvoice.id);
                        }
                        if (signNowInvoice && signNowInvoice.status === 'open') {
                            await this.StripeClient.invoices.pay(signNowInvoice.id, {
                                payment_method: paymentMethodId,
                            });
                        }

                        return {
                            status: true,
                            subscriptionId: resultSubscriptionId,
                            productId: resultProductId,
                            signHereSubscriptionId: signNowSub.id,
                            signHereProductId: signNowProduct.id,
                            isNewSubscription: true,
                        };
                    } catch (error) {
                        console.error('Failed to create new SignHere subscription:', error);
                    }
                }

                return {
                    status: true,
                    subscriptionId: resultSubscriptionId,
                    productId: resultProductId,
                    signHereSubscriptionId: null,
                    signHereProductId: null,
                    isNewSubscription: true,
                };

            } else {
                // ACTIVE or TRIALING subscription → Just update payment method and promo
                const updatePayload: Stripe.SubscriptionUpdateParams = {
                    default_payment_method: paymentMethodId,
                    proration_behavior: 'none',
                };

                if (promoCode) {
                    updatePayload.discounts = [{ promotion_code: promoCode }];
                }

                await this.StripeClient.subscriptions.update(user.subscriptionId, updatePayload);

                await this.databaseService.user.update({
                    where: { id: user.id },
                    data: {
                        cardOnFile: true,
                        accountStatus: 'active',
                        ...(promoCode && { referralCodeApplied: true }),
                    },
                });


                // Also update SignHere subscription payment method
                if (signNowSubscriptionId) {
                    try {
                        await this.StripeClient.subscriptions.update(signNowSubscriptionId, {
                            default_payment_method: paymentMethodId,
                        });
                    } catch (error) {
                        console.error('Failed to update SignHere subscription payment method:', error);
                    }
                }

                // Also update payment method on all active employee subscriptions
                if (user.companyId) {
                    const employees = await this.databaseService.user.findMany({
                        where: {
                            companyId: user.companyId,
                            userType: UserTypes.EMPLOYEE,
                            isDeleted: false,
                        },
                        select: { id: true, subscriptionId: true },
                    });

                    for (const employee of employees) {
                        if (employee.subscriptionId) {
                            try {
                                await this.StripeClient.subscriptions.update(employee.subscriptionId, {
                                    default_payment_method: paymentMethodId,
                                });
                            } catch (error) {
                                console.error(`Failed to update employee subscription payment method ${employee.subscriptionId}:`, error);
                            }
                        }
                    }
                }
            }

            return {
                status: true,
                subscriptionId: resultSubscriptionId,
                productId: resultProductId,
                signHereSubscriptionId: signNowSubscriptionId,
                signHereProductId: null,
                isNewSubscription: false,
            };
        } catch (error) {
            console.error('Stripe activateSubscription error:', error);
            throw error;
        }
    }
}