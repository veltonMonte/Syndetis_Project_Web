import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShippingPackageDto {
  @ApiProperty({ example: 500, description: 'Peso unitário em gramas' })
  @IsInt({ message: 'O peso unitário (weightGrams) deve ser um número inteiro em gramas' })
  @Min(1, { message: 'O peso unitário (weightGrams) deve ser de no mínimo 1 grama' })
  @Max(30_000, { message: 'O peso unitário (weightGrams) não pode exceder 30.000 gramas (30 kg)' })
  weightGrams: number;

  @ApiProperty({ example: 20 })
  @IsInt({ message: 'O comprimento (lengthCm) deve ser um número inteiro em centímetros' })
  @Min(1, { message: 'O comprimento (lengthCm) deve ter no mínimo 1 cm' })
  @Max(100, { message: 'O comprimento (lengthCm) não pode exceder 100 cm' })
  lengthCm: number;

  @ApiProperty({ example: 15 })
  @IsInt({ message: 'A largura (widthCm) deve ser um número inteiro em centímetros' })
  @Min(1, { message: 'A largura (widthCm) deve ter no mínimo 1 cm' })
  @Max(100, { message: 'A largura (widthCm) não pode exceder 100 cm' })
  widthCm: number;

  @ApiProperty({ example: 10 })
  @IsInt({ message: 'A altura (heightCm) deve ser um número inteiro em centímetros' })
  @Min(1, { message: 'A altura (heightCm) deve ter no mínimo 1 cm' })
  @Max(100, { message: 'A altura (heightCm) não pode exceder 100 cm' })
  heightCm: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'A quantidade (quantity) deve ser um número inteiro' })
  @Min(1, { message: 'A quantidade (quantity) de pacotes deve ser de no mínimo 1' })
  @Max(100, { message: 'A quantidade (quantity) de pacotes não pode exceder 100 unidades' })
  quantity: number;
}

export class QuoteShippingRequestDto {
  @ApiProperty({ example: '20040002', description: 'CEP de destino, 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'O CEP de destino (destinationZipCode) deve conter exatamente 8 dígitos numéricos (ex.: 01001000)' })
  destinationZipCode: string;

  @ApiPropertyOptional({ example: '01001000', description: 'CEP de origem; padrão: SHIPPING_ORIGIN_ZIP' })
  @IsOptional()
  @Matches(/^\d{8}$/, { message: 'O CEP de origem (originZipCode) deve conter exatamente 8 dígitos numéricos (ex.: 01001000)' })
  originZipCode?: string;

  @ApiProperty({ type: [ShippingPackageDto] })
  @ValidateNested({ each: true })
  @Type(() => ShippingPackageDto)
  @ArrayMinSize(1, { message: 'É necessário informar ao menos 1 pacote para cotação de frete' })
  @ArrayMaxSize(100, { message: 'Não é permitido cotar mais de 100 pacotes em uma única requisição' })
  packages: ShippingPackageDto[];
}

export class ShippingOptionDto {
  @ApiProperty({ example: 'PAC' })
  service: string;

  @ApiProperty({ example: '23.50', description: 'Valor em reais com 2 casas decimais' })
  price: string;

  @ApiProperty({ example: 7 })
  deliveryDays: number;
}

export class QuoteShippingResponseDto {
  @ApiProperty({ example: 'stub' })
  provider: string;

  @ApiProperty({ type: [ShippingOptionDto] })
  options: ShippingOptionDto[];
}
