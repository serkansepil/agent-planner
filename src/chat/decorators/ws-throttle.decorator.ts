import { SetMetadata } from '@nestjs/common';

export const WsThrottle = (limit: number, ttl: number) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata('throttle_limit', limit)(target, propertyKey, descriptor);
    SetMetadata('throttle_ttl', ttl)(target, propertyKey, descriptor);
  };
};
