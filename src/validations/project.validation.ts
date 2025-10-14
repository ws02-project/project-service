import Joi from 'joi';
import { ProjectStatus } from '../models/project.model';

export const createProjectSchema = {
  body: Joi.object({
    name: Joi.string().required().min(1).max(255),
    description: Joi.string().optional().max(5000),
    status: Joi.string()
      .valid(...Object.values(ProjectStatus))
      .optional(),
    owner: Joi.string().optional().max(100),
    members: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),
};

export const updateProjectSchema = {
  body: Joi.object({
    name: Joi.string().optional().min(1).max(255),
    description: Joi.string().optional().max(5000),
    status: Joi.string()
      .valid(...Object.values(ProjectStatus))
      .optional(),
    owner: Joi.string().optional().max(100),
    members: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }).min(1),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const getProjectSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const deleteProjectSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const addMemberSchema = {
  body: Joi.object({
    memberId: Joi.string().required(),
  }),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const removeMemberSchema = {
  body: Joi.object({
    memberId: Joi.string().required(),
  }),
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};
