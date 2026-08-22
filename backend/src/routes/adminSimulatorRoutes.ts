import { Router } from 'express';
import { adminAuth } from '../middleware/adminMiddleware';
import { simulatorService } from '../services/simulatorService';
import { getSimulationRuns } from '../config/db';

const router = Router();

// POST /api/admin/simulator/start
router.post('/start', adminAuth, async (req: any, res) => {
  try {
    const { usersCount, targetRate, rateUnit, duration, trafficProfile, mode } = req.body;
    await simulatorService.startSimulator({
      usersCount: usersCount ? parseInt(usersCount) : undefined,
      targetRate: targetRate ? parseInt(targetRate) : undefined,
      rateUnit,
      duration,
      trafficProfile,
      mode: (mode === 'DIRTY' || mode === 'CHAOS') ? 'DIRTY' : 'CLEAN'
    });
    res.json({ success: true, message: 'Simulator started successfully.', status: simulatorService.getStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/simulator/pause
router.post('/pause', adminAuth, async (req: any, res) => {
  try {
    simulatorService.pauseSimulator();
    res.json({ success: true, message: 'Simulator paused.', status: simulatorService.getStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/simulator/resume
router.post('/resume', adminAuth, async (req: any, res) => {
  try {
    simulatorService.resumeSimulator();
    res.json({ success: true, message: 'Simulator resumed.', status: simulatorService.getStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/simulator/stop
router.post('/stop', adminAuth, async (req: any, res) => {
  try {
    await simulatorService.stopSimulator();
    res.json({ success: true, message: 'Simulator stopped successfully.', status: simulatorService.getStatus() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/simulator/status
router.get('/status', adminAuth, async (req: any, res) => {
  try {
    res.json(simulatorService.getStatus());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/simulator/history
router.get('/history', adminAuth, async (req: any, res) => {
  try {
    const history = await getSimulationRuns();
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/simulator/test-coverage
router.post('/test-coverage', adminAuth, async (req: any, res) => {
  try {
    await simulatorService.runCoverageTest();
    res.json({ success: true, message: 'Forced event coverage test executed successfully.', report: simulatorService.getCoverageReport() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/simulator/coverage-report
router.get('/coverage-report', adminAuth, async (req: any, res) => {
  try {
    res.json(simulatorService.getCoverageReport());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
