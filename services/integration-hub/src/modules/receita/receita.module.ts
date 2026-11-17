import { Module } from '@nestjs/common';
import { BrasilApiCnpjProvider } from './brasilapi-cnpj.provider.js';
import { ReceitaController } from './receita.controller.js';
import { ReceitaService } from './receita.service.js';
import { SerproCpfProvider } from './serpro-cpf.provider.js';

/** CPF, CNPJ and MEI checks against the Receita Federal. */
@Module({
  controllers: [ReceitaController],
  providers: [ReceitaService, BrasilApiCnpjProvider, SerproCpfProvider],
})
export class ReceitaModule {}
