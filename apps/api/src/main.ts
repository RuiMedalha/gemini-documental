import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));

    const port = Number(process.env.PORT) || 3001;
    await app.listen(port, '0.0.0.0');
    console.log(`✔ Servidor DocFlow API operacional na porta ${port}`);
  } catch (error) {
    console.error('❌ Erro fatal ao iniciar o servidor:', error);
    process.exit(1);
  }
}
bootstrap();
