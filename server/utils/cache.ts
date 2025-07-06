type CacheOptions = {
  ttl: number;
};

type CacheDecorator = (
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any>;

const cacheStore = new Map<string, { value: any; timestamp: number }>();

export const cache = Object.assign(
  (options: Partial<CacheOptions> = {}) => {
    return (
      target: any,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<any>,
    ) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const key = `${String(propertyKey)}:${JSON.stringify(args)}`;
        const cached = cacheStore.get(key);
        const now = Date.now();

        if (cached && (!options.ttl || now - cached.timestamp < options.ttl * 1000)) {
          return cached.value;
        }

        const result = await originalMethod.apply(this, args);
        cacheStore.set(key, { value: result, timestamp: now });
        return result;
      };

      return descriptor;
    };
  },
  {
    invalidate: (key: string) => {
      cacheStore.delete(key);
      console.log(`Cache invalidated for key: ${key}`);
    },
  },
);
