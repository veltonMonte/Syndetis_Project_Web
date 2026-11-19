import { Module } from '@nestjs/common';
import { BrasilApiCnpjProvider } from './brasilapi-cnpj.provider.js';
import { ReceitaController } from './receita.controller.js';
import { ReceitaService } from './receita.service.js';

/** CNPJ and MEI checks against the Receita Federal (merchant accounts are CNPJ only). */
@Module({
  controllers: [ReceitaController],
  providers: [ReceitaService, BrasilApiCnpjProvider],
})
export class ReceitaModule {}
