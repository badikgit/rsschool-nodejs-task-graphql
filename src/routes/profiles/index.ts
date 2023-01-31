import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createProfileBodySchema, changeProfileBodySchema } from './schema';
import type { ProfileEntity } from '../../utils/DB/entities/DBProfiles';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<ProfileEntity[]> {
    return this.db.profiles.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;
      try {
        const profile = await this.db.profiles.findOne({ key: 'id', equals: id });
        if (!profile) throw this.httpErrors.notFound(`The profile with id ${id} not found.`);
        return profile;
      } catch (error) {
        return reply.send(error);
      }
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createProfileBodySchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { userId } = request.body;
      try {
        const user = await this.db.users.findOne({ key: 'id', equals: userId });
        if (!user) throw this.httpErrors.badRequest(`The user with id ${userId} not found.`);

        const { memberTypeId } = request.body;
        const memberType = await this.db.memberTypes.findOne({ key: 'id', equals: memberTypeId });
        if (!memberType) throw fastify.httpErrors.badRequest(`The member type with id ${memberTypeId} not found.`);

        const profile = await this.db.profiles.findOne({ key: 'userId', equals: userId });
        if (profile) throw fastify.httpErrors.badRequest(`The user with id ${userId} already has a profile.`);

        const newProfile = this.db.profiles.create(request.body);
        if (!(await newProfile)) throw this.httpErrors.preconditionFailed('Failed to create profile.');

        return newProfile;
      } catch (error) {
        return reply.send(error);
      }
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;
      try {
        const profile = await this.db.profiles.findOne({ key: 'id', equals: id });
        if (!profile) throw this.httpErrors.badRequest(`The profile with id ${id} not found.`);

        const deletedProfile = this.db.profiles.delete(id);
        if (!(await deletedProfile)) throw this.httpErrors.preconditionFailed('Profile delete error.');

        return deletedProfile;
      } catch (error) {
        return reply.send(error);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;
      const newFields = request.body;
      try {
        const profile = await this.db.profiles.findOne({ key: 'id', equals: id });
        if (!profile) throw this.httpErrors.badRequest(`The profile with id ${id} not found.`);

        const updatedProfile = this.db.profiles.change(id, newFields);
        if (!(await updatedProfile)) throw this.httpErrors.preconditionFailed('Update profile error.');

        return updatedProfile;
      } catch (error) {
        return reply.send(error);
      }
    }
  );
};

export default plugin;
