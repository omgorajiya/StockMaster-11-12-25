'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { operationsService } from '@/lib/operations';
import { productService, Warehouse } from '@/lib/products';
import { showToast } from '@/lib/toast';
import { Filter, Waves, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Alert,
  Button,
  Card,
  CardContent,
  FieldErrorText,
  FieldHint,
  FieldLabel,
  Input,
  PageHeader,
  Select,
} from '@/components/ui';

type FormValues = {
  warehouse: string;
  name: string;
  date_from: string;
  date_to: string;
};

export default function NewPickWavePage() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError,
  } = useForm<FormValues>({
    mode: 'onBlur',
    defaultValues: {
      warehouse: '',
      name: '',
      date_from: '',
      date_to: '',
    },
  });

  const warehouse = watch('warehouse');

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      const data = await productService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      showToast.error('Failed to load warehouses');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await operationsService.generatePickWave({
        name: values.name || undefined,
        warehouse: parseInt(values.warehouse, 10),
        date_from: values.date_from || undefined,
        date_to: values.date_to || undefined,
        status: 'ready',
      });

      if (response.success) {
        showToast.success('Pick wave created successfully');
        router.push(`/pick-waves/${response.pick_wave.id}`);
        return;
      }

      const msg = 'Failed to create pick wave';
      setError('root', { message: msg });
      showToast.error(msg);
    } catch (err: any) {
      const data = err?.response?.data;
      const status = err?.response?.status;

      if (typeof data === 'string') {
        const titleMatch = data.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch?.[1]?.trim();
        const msg = title ? `${title} (HTTP ${status ?? 'error'})` : 'Server error while creating pick wave';
        setError('root', { message: msg });
        showToast.error(msg);
        return;
      }

      const message = data?.message || data?.detail || data?.error || err?.message || 'Failed to create pick wave';

      if (status === 400 && typeof message === 'string' && message.toLowerCase().includes('no matching')) {
        const ok = confirm(`${message}\n\nCreate an empty pick wave instead?`);
        if (ok) {
          const wave = await operationsService.createPickWave({
            name: values.name || `Wave ${new Date().toLocaleString()}`,
            warehouse: parseInt(values.warehouse, 10),
            status: 'planned',
          });
          showToast.success('Empty pick wave created');
          router.push(`/pick-waves/${wave.id}`);
          return;
        }
      }

      setError('root', { message });
      showToast.error(message);
    }
  });

  const dateFrom = watch('date_from');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <Waves size={22} className="text-primary-600 dark:text-primary-400" />
            Create New Pick Wave
          </span>
        }
        description="Group delivery orders into an optimized picking batch"
        actions={
          <Button
            type="button"
            variant="secondary"
            leftIcon={<X size={18} />}
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        }
      />

      {errors.root?.message ? (
        <Alert
          variant="danger"
          title="Unable to create pick wave"
          description={errors.root?.message}
        />
      ) : null}

      <Card className="hover-lift">
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="name">Wave Name</FieldLabel>
                <Input id="name" placeholder="Optional wave name" {...register('name')} />
                <FieldHint>Leave empty to auto-name the wave.</FieldHint>
              </div>

              <div>
                <FieldLabel htmlFor="warehouse">Warehouse *</FieldLabel>
                <Select
                  id="warehouse"
                  invalid={!!errors.warehouse}
                  {...register('warehouse', { required: 'Warehouse is required' })}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={String(wh.id)}>
                      {wh.name} ({wh.code})
                    </option>
                  ))}
                </Select>
                <FieldErrorText error={errors.warehouse} />
              </div>

              <div>
                <FieldLabel htmlFor="date_from">Date From</FieldLabel>
                <Input id="date_from" type="date" {...register('date_from')} />
              </div>

              <div>
                <FieldLabel htmlFor="date_to">Date To</FieldLabel>
                <Input
                  id="date_to"
                  type="date"
                  invalid={!!errors.date_to}
                  {...register('date_to', {
                    validate: (value) => {
                      if (!value || !dateFrom) return true;
                      return value >= dateFrom || 'Date To must be on/after Date From';
                    },
                  })}
                />
                <FieldErrorText error={errors.date_to} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                type="submit"
                loading={isSubmitting}
                leftIcon={<Filter size={18} />}
                className="w-full sm:w-auto"
                disabled={!warehouse}
              >
                Create Pick Wave
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-900/10">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Filter className="text-blue-600 dark:text-blue-300 mt-0.5" size={18} />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">How it works</h3>
              <p className="text-sm text-blue-800/90 dark:text-blue-100/80">
                This creates a pick wave from delivery orders that match your criteria. If there are no matching
                orders, you can optionally create an empty wave and plan it manually.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
