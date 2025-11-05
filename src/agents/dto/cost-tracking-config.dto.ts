import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsString,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum CostCurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
}

export class CostTrackingConfigDto {
  @ApiPropertyOptional({
    description: 'Enable cost tracking for this agent',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = false;

  @ApiPropertyOptional({
    description: 'Currency for cost tracking',
    enum: CostCurrency,
    default: CostCurrency.USD,
    example: CostCurrency.USD,
  })
  @IsEnum(CostCurrency)
  @IsOptional()
  currency?: CostCurrency = CostCurrency.USD;

  @ApiPropertyOptional({
    description: 'Cost per 1K input tokens',
    minimum: 0,
    example: 0.01,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPerInputToken?: number;

  @ApiPropertyOptional({
    description: 'Cost per 1K output tokens',
    minimum: 0,
    example: 0.03,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPerOutputToken?: number;

  @ApiPropertyOptional({
    description: 'Monthly budget limit',
    minimum: 0,
    example: 100.0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyBudgetLimit?: number;

  @ApiPropertyOptional({
    description: 'Alert threshold (percentage of budget)',
    minimum: 0,
    maximum: 100,
    example: 80,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  alertThreshold?: number;

  @ApiPropertyOptional({
    description: 'Notification email for cost alerts',
    example: 'admin@example.com',
  })
  @IsString()
  @IsOptional()
  alertEmail?: string;
}
