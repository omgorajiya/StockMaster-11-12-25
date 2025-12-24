'use client';

import { useRouter } from 'next/navigation';
import { supplierService } from '@/lib/suppliers';
import { Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { showToast } from '@/lib/toast';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardContent,
  FieldErrorText,
  FieldHint,
  FieldLabel,
  Input,
  PageHeader,
  Textarea,
} from '@/components/ui';

type FormValues = {
  name: string;
  code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: number;
  is_active: boolean;
};

export default function NewSupplierPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      code: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: '',
      lead_time_days: 7,
      is_active: true,
    },
  });

  const isActive = watch('is_active');

  const onSubmit = handleSubmit(async (values) => {
    try {
      await supplierService.create({
        ...values,
        code: values.code.toUpperCase(),
        lead_time_days: Number(values.lead_time_days) || 0,
      });
      showToast.success('Supplier created successfully');
      router.push('/suppliers');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to create supplier';
      setError('root', { message: errorMessage });
      showToast.error(errorMessage);
    }
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="New Supplier"
        description="Create a supplier profile for purchasing, lead times, and payment terms"
        actions={
          <ButtonLink
            href="/suppliers"
            variant="secondary"
            leftIcon={<X size={18} />}
            className="w-full sm:w-auto"
          >
            Cancel
          </ButtonLink>
        }
      />

      {errors.root?.message ? (
        <Alert
          variant="danger"
          title="Unable to create supplier"
          description={errors.root?.message}
        />
      ) : null}

      <Card className="hover-lift">
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="name">Supplier Name *</FieldLabel>
                <Input
                  id="name"
                  placeholder="Enter supplier name"
                  invalid={!!errors.name}
                  {...register('name', { required: 'Supplier name is required' })}
                />
                <FieldErrorText error={errors.name} />
              </div>

              <div>
                <FieldLabel htmlFor="code">Supplier Code *</FieldLabel>
                <Input
                  id="code"
                  placeholder="SUP-001"
                  className="font-mono"
                  invalid={!!errors.code}
                  {...register('code', {
                    required: 'Supplier code is required',
                    setValueAs: (v) => String(v || '').toUpperCase(),
                  })}
                />
                <FieldHint>Use a short code your team recognizes quickly.</FieldHint>
                <FieldErrorText error={errors.code} />
              </div>

              <div>
                <FieldLabel htmlFor="contact_person">Contact Person</FieldLabel>
                <Input
                  id="contact_person"
                  placeholder="John Doe"
                  {...register('contact_person')}
                />
              </div>

              <div>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="supplier@example.com"
                  invalid={!!errors.email}
                  {...register('email', {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                />
                <FieldErrorText error={errors.email} />
              </div>

              <div>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  invalid={!!errors.phone}
                  {...register('phone', {
                    pattern: {
                      value: /^\+?[\d\s-()]+$/,
                      message: 'Please enter a valid phone number',
                    },
                  })}
                />
                <FieldErrorText error={errors.phone} />
              </div>

              <div>
                <FieldLabel htmlFor="lead_time_days">Lead Time (Days) *</FieldLabel>
                <Input
                  id="lead_time_days"
                  type="number"
                  min={0}
                  invalid={!!errors.lead_time_days}
                  {...register('lead_time_days', {
                    valueAsNumber: true,
                    required: 'Lead time is required',
                    min: { value: 0, message: 'Lead time cannot be negative' },
                  })}
                />
                <FieldHint>Average number of days from order to delivery.</FieldHint>
                <FieldErrorText error={errors.lead_time_days} />
              </div>

              <div>
                <FieldLabel htmlFor="payment_terms">Payment Terms</FieldLabel>
                <Input id="payment_terms" placeholder="Net 30, COD, etc." {...register('payment_terms')} />
              </div>

              <div className="md:col-span-2">
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Textarea id="address" placeholder="Enter supplier address" {...register('address')} />
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    {...register('is_active')}
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {isActive ? 'Active supplier' : 'Inactive supplier'}
                  </span>
                </label>
                <FieldHint>Inactive suppliers are hidden from default purchasing flows.</FieldHint>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button type="submit" loading={isSubmitting} leftIcon={<Save size={18} />} className="w-full sm:w-auto">
                Create Supplier
              </Button>
              <ButtonLink href="/suppliers" variant="secondary" className="w-full sm:w-auto">
                Cancel
              </ButtonLink>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

