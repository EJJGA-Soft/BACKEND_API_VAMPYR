import { Router } from 'express';
import { 
  getConversations, 
  getConversationById, 
  createConversation, 
  updateConversation,
  deleteConversation 
} from '../controllers/conversation.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getConversations);
router.get('/:id', getConversationById);
router.post('/', createConversation);
router.put('/:id', updateConversation);
router.delete('/:id', deleteConversation);

export default router;
