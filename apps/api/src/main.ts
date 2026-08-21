import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para o frontend aceder
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Aumentar o limite de payload para aceitar PDFs e fotos pesadas
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const port = process.env.PORT || 3001;
  // BIND OBRIGATÓRIO EM 0.0.0.0 PARA DOCKER
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 DocFlow API operacional e escutando em http://0.0.0.0:${port}`);
}
bootstrap();
