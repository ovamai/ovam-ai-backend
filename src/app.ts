import express, { Request, Response } from 'express';
import reviewRoutes from './routes/reviewRoutes';
import logger from './utils/logger';
import morgan from 'morgan';
import githubRoutes from './routes/githubRoutes';

const app = express();

app.use(
  morgan('combined', {
    stream: {
      write: message => logger.http(message.trim()),
    },
  }),
);

app.use(
  express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use('/api/v1', reviewRoutes);
app.use('/api/v1', githubRoutes);
app.get('/', (req: Request, res: Response) => {
  res.send('Server is running just fine!!');
});
export default app;
