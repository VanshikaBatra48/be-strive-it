import { Router, type Request, type Response } from 'express';
import taskController from '../controllers/taskController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

//getting specific task using id
