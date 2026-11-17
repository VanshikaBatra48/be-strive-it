import { Request, Response } from 'express';

import * as taskSubmissionService from '../service/taskSubmissionService';


// -------------------------------------
// SUBMIT TASK
// -------------------------------------

export const submitTask = async (
  req: Request,
  res: Response
) => {
  try {
    const taskId = Number(req.params.taskId);
    const submittedBy = Number(req.user?.id);

    const { submissionText, attachmentUrl } = req.body;

    // Validate task ID
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Validate authenticated user
    if (!Number.isInteger(submittedBy) || submittedBy <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate submission text
    if (
      typeof submissionText !== 'string' ||
      !submissionText.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Submission text is required'
      });
    }

    // Validate attachment URL
    if (
      attachmentUrl !== undefined &&
      attachmentUrl !== null &&
      typeof attachmentUrl !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attachment URL'
      });
    }

    const result = await taskSubmissionService.submitTask({
      taskId,
      submittedBy,
      submissionText: submissionText.trim(),
      attachmentUrl
    });

    return res.status(201).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Submit task error:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to submit task'
    });
  }
};


// -------------------------------------
// REQUEST CHANGES
// -------------------------------------

export const requestChanges = async (
  req: Request,
  res: Response
) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const mentorId = Number(req.user?.id);

    const { feedback } = req.body;

    // Validate submission ID
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission ID'
      });
    }

    // Validate mentor authentication
    if (!Number.isInteger(mentorId) || mentorId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate feedback
    if (
      typeof feedback !== 'string' ||
      !feedback.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Mentor feedback is required'
      });
    }

    const result = await taskSubmissionService.requestChanges({
      submissionId,
      mentorId,
      feedback: feedback.trim()
    });

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Request changes error:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to request changes'
    });
  }
};


// -------------------------------------
// APPROVE SUBMISSION
// -------------------------------------

export const approveSubmission = async (
  req: Request,
  res: Response
) => {
  try {
    const submissionId = Number(req.params.submissionId);
    const mentorId = Number(req.user?.id);

    // Validate submission ID
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission ID'
      });
    }

    // Validate mentor authentication
    if (!Number.isInteger(mentorId) || mentorId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const result = await taskSubmissionService.approveSubmission({
      submissionId,
      mentorId
      
    });
    

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Approve submission error:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to approve submission'
    });
  }
  
};

// -------------------------------------
// GET SUBMISSION HISTORY
// -------------------------------------

export const getSubmissionHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const taskId = Number(req.params.taskId);
    const userId = Number(req.user?.id);

    // IMPORTANT: Validate role before passing it to service.
    const role = req.user?.role;

    // Validate task ID
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Validate user ID
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate user role
    if (
      typeof role !== 'string' ||
      !['admin', 'mentor', 'mentee'].includes(role)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Valid user role not found'
      });
    }

    const result =
      await taskSubmissionService.getSubmissionHistory(
        taskId,
        userId,
        role
      );

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('Get submission history error:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to fetch submission history'
    });
  }
};


// -------------------------------------
// GET SINGLE SUBMISSION
// -------------------------------------

export const getSubmissionById = async (
  req: Request,
  res: Response
) => {
  try {
    const submissionId = Number(req.params.submissionId);

    const userId = Number(req.user?.id);
    const role = req.user?.role;

    // Validate submission ID
    if (!Number.isInteger(submissionId) || submissionId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission ID'
      });
    }

    // Validate authentication
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (
      typeof role !== 'string' ||
      !['admin', 'mentor', 'mentee'].includes(role)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Valid user role not found'
      });
    }

    const result =
      await taskSubmissionService.getSubmissionById(
        submissionId,
        userId,
        role
      );

    return res.status(200).json({
      success: true,
      submission: result
    });

  } catch (error: any) {
    console.error('Get submission error:', error);

    return res.status(404).json({
      success: false,
      message: error.message || 'Submission not found'
    });
  }
};