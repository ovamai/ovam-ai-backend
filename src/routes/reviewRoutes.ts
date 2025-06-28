import { Router } from 'express';
import { postReview } from '../controllers/reviewController';

const router = Router();
router.post('/review', postReview);

export default router;
