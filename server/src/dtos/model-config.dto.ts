import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { CLIPMode, ModelType } from 'src/interfaces/machine-learning.interface';
import { Optional, ValidateBoolean } from 'src/validation';

export class ModelConfig {
  @ValidateBoolean()
  enabled!: boolean;

  @IsString()
  @IsNotEmpty()
  modelName!: string;

  @IsEnum(ModelType)
  @Optional()
  @ApiProperty({ enumName: 'ModelType', enum: ModelType })
  modelType?: ModelType;
}

export class CLIPConfig extends ModelConfig {
  @IsEnum(CLIPMode)
  @Optional()
  @ApiProperty({ enumName: 'CLIPMode', enum: CLIPMode })
  mode?: CLIPMode;

  @IsNumber()
  @Min(0.01)
  @Max(0.1)
  @Type(() => Number)
  @ApiProperty({ type: 'number', format: 'float' })
  duplicateThreshold!: number;
}

export class RecognitionConfig extends ModelConfig {
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  @ApiProperty({ type: 'number', format: 'float' })
  minScore!: number;

  @IsNumber()
  @Min(0)
  @Max(2)
  @Type(() => Number)
  @ApiProperty({ type: 'number', format: 'float' })
  maxDistance!: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @ApiProperty({ type: 'integer' })
  minFaces!: number;
}
