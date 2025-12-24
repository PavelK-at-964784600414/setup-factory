'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Parameter {
  name: string;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  default?: string;
  options?: string[];
}

interface FormRendererProps {
  parameters: Parameter[];
  onSubmit: (data: Record<string, any>) => void;
  defaultValues?: Record<string, any>;
}

export function FormRenderer({ parameters, onSubmit, defaultValues }: FormRendererProps) {
  // Build Zod schema dynamically from parameters
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  
  parameters.forEach((param) => {
    let field: z.ZodTypeAny;

    switch (param.type) {
      case 'number':
        field = z.coerce.number();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      default:
        field = z.string();
    }

    if (param.required) {
      schemaFields[param.name] = field;
    } else {
      schemaFields[param.name] = field.optional();
    }
  });

  const schema = z.object(schemaFields);
  type FormData = z.infer<typeof schema>;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  });

  const renderField = (param: Parameter) => {
    switch (param.type) {
      case 'boolean':
        return (
          <Controller
            name={param.name}
            control={control}
            render={({ field }) => (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={param.name}
                  checked={field.value as boolean}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor={param.name} className="ml-2 text-sm text-gray-700">
                  {param.title}
                </label>
              </div>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={param.name}
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id={param.name}
                className="input"
              >
                <option value="">-- Select {param.title} --</option>
                {param.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          />
        );

      case 'textarea':
        return (
          <Controller
            name={param.name}
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                id={param.name}
                rows={4}
                className="input"
                placeholder={param.description}
              />
            )}
          />
        );

      default:
        return (
          <Controller
            name={param.name}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type={param.type === 'number' ? 'number' : 'text'}
                id={param.name}
                className="input"
                placeholder={param.description}
              />
            )}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {parameters.map((param) => (
        <div key={param.name}>
          {param.type !== 'boolean' && (
            <label htmlFor={param.name} className="label">
              {param.title}
              {param.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}

          {renderField(param)}

          {param.description && param.type !== 'textarea' && (
            <p className="text-sm text-gray-500 mt-1">{param.description}</p>
          )}

          {errors[param.name] && (
            <p className="text-sm text-red-600 mt-1">
              {errors[param.name]?.message as string}
            </p>
          )}
        </div>
      ))}

      <button type="submit" className="btn btn-primary w-full">
        Continue
      </button>
    </form>
  );
}
