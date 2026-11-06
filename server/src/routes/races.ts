import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { loadRaceResults, tookPartIn } from '../rooms/persist.js';

/** HIST-02 : détail d'une course, réservé aux personnes qui y ont participé. */
const router = Router();
router.use(requireAuth);

router.get('/:id', async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return res.status(404).json({ error: 'NOT_FOUND' });
  if (!(await tookPartIn(id.data, req.auth!))) return res.status(404).json({ error: 'NOT_FOUND' });
  const results = await loadRaceResults(id.data);
  if (!results) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(results);
});

export default router;
