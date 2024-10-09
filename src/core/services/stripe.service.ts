import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
import { AddUserDTO } from "src/company/validators";
import { DatabaseService } from "src/database/database.service";
import Stripe from "stripe";


@Injectable()
export class StripeService {
    private StripeClient: Stripe;

    constructor(
        private readonly config: ConfigService,
        private databaseServive: DatabaseService
    ) {
        this.StripeClient = new Stripe(config.get('STRIPE_API_KEY'))
    }

    // Creating new stripe customer
    async createStripeCustomer(builder: any) {
        try {
            // Check already added to stripe customers
            let existingCustomer = await this.getStripeCustomer(builder.stripeCustomerId);
            if(!existingCustomer) {
                let customer = await this.StripeClient.customers.create({
                    name: builder.name,
                    email: builder.email
                });
                // Insert stripe customer id into user's table
                await this.databaseServive.user.update({
                    where: { id: builder.id },
                    data: {
                        stripeCustomerId: customer.id
                    }
                });

                return customer;
            }
            return existingCustomer;
        } catch (error) {
            console.log("Error creating stripe customer", error)
            throw new InternalServerErrorException();
        }
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
    async createNewSubscription(builder: any, paymentMethodId: string, body: AddUserDTO) {
        try {
            let customer = await this.createStripeCustomer(builder);
            const feeAmount = parseFloat(builder.company.extraFee) * 100;

            if(!customer || (customer as any).deleted) {
                return { status: false, message: "Something went wrong" };
            }

            // Check if the payment method is already attached
            const attachedPaymentMethods = await this.StripeClient.paymentMethods.list({
                customer: customer.id,
                type: 'card',
            });
    
            const isPaymentMethodAttached = attachedPaymentMethods.data.some(pm => pm.id === paymentMethodId);
    
            // Attach the payment method if it's not already attached
            if (!isPaymentMethodAttached) {
                await this.StripeClient.paymentMethods.attach(paymentMethodId, { customer: customer.id });
                
                // Check customer has a default payment method
                const customerData = customer as Stripe.Customer;
                const hasDefaultPaymentMethod = customerData.invoice_settings?.default_payment_method;

                if (!hasDefaultPaymentMethod) {
                    // Set this payment method as the default for future invoices
                    await this.StripeClient.customers.update(customer.id, {
                        invoice_settings: {
                            default_payment_method: paymentMethodId,
                        },
                    });
                }
            }

            // Create new product in stripe
            const product = await this.StripeClient.products.create({
                name: `${builder.company.name}-${body.name}`
            });
    
            // Create a price for the product
            const price = await this.StripeClient.prices.create({
                unit_amount: feeAmount,
                currency: 'usd',
                recurring: { interval: 'month' },
                product: product.id,
            });
    
            // Create a subscription for the new employee
            const subscription = await this.StripeClient.subscriptions.create({
                customer: customer.id,
                items: [{ price: price.id }],
                default_payment_method: paymentMethodId,
            });

            return { status: true, subscriptionId: subscription.id, productId: product.id , message: "Subscription added" };
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
     async updateSubscriptionAmount(stripeCustomerId: string, employeeSubscriptionId: string, newAmount: number) {
        try {
            let customer = await this.getStripeCustomer(stripeCustomerId);
            let subscription = await this.StripeClient.subscriptions.retrieve(employeeSubscriptionId);
            let productId = subscription.items.data[0].price.product;
            
            if(customer && subscription && productId) {
                // Create new price and attach it with current subscription product
                let newPrice = await this.StripeClient.prices.create({
                    unit_amount: newAmount,
                    currency: 'usd',
                    recurring: { interval: 'month' },
                    product: productId as string,
                });
                if(newPrice.id) {
                    // Update new price in subscription
                    await this.StripeClient.subscriptions.update(employeeSubscriptionId, {
                        items: [{
                            id: subscription.items.data[0].id,
                            price: newPrice.id,
                        }],
                        proration_behavior:  'none'
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
            await this.StripeClient.subscriptions.cancel(subscriptionId);
            return true;
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException();
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

            // Create new subscription for the employee
            const subscription = await this.StripeClient.subscriptions.create({
                customer: user.stripeCustomerId,
                items: [{ price: activePriceId }],
                default_payment_method: paymentMethodId,
            });

            return { status: true, subscriptionId: subscription.id, message: 'Subscription renewed' }
        } catch (error) {
            console.log("error", error)
            return { status: false, message: error.raw.message };
        }
    }
}