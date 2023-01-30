import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';
import { getError } from '../../utils/getError';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
    return this.db.users.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      try {
        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.notFound(`The user with id ${id} not found.`);
        return user;
      } catch (error) {
        return reply.send(getError(error, fastify, { id, resourse: 'user' }));
      }
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        const newUser = this.db.users.create(request.body);
        if (!(await newUser)) throw this.httpErrors.preconditionFailed('Failed to create user.');
        return newUser;
      } catch (error) {
        return reply.send(getError(error, fastify));
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
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      try {
        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.notFound(`The user with id ${id} not found.`);

        const profile = await this.db.profiles.findOne({ key: 'userId', equals: id });
        if (profile) {
          const deletedProfile = await this.db.profiles.delete(profile.id);
          if (!deletedProfile) throw this.httpErrors.preconditionFailed('Profile delete error.');
        }

        const posts = await this.db.posts.findMany({ key: 'userId', equals: id });
        if (posts.length && !(await Promise.all(posts.map((post) => this.db.posts.delete(post.id)))).every((post) => post)) throw this.httpErrors.preconditionFailed('Posts delete error.');

        const followers = await this.db.users.findMany({ key: 'subscribedToUserIds', equals: [id] });
        if (followers.length && !(await Promise.all(followers.map((follower) => this.db.users.change(follower.id, { subscribedToUserIds: [...follower.subscribedToUserIds].filter((fId) => fId !== id) })))).every((follower) => follower)) throw this.httpErrors.preconditionFailed('Followers delete error.');

        const deletedUser = this.db.users.delete(id);
        if (!(await deletedUser)) throw this.httpErrors.preconditionFailed('Posts delete error.');
        return deletedUser;

      } catch (error) {
        return reply.send(getError(error, fastify, { id, resourse: 'user' }));
      }
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      const { userId } = request.body;

      try {
        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.notFound(`The user with id ${id} not found.`);

        const candidate = await this.db.users.findOne({ key: 'id', equals: userId });
        if (!candidate) throw this.httpErrors.notFound(`The user with id ${id} not found.`);

        const isFollower = user.subscribedToUserIds.includes(userId);

        if (isFollower) throw this.httpErrors.badRequest(`The user with id ${id} is already subscribed to the user with id ${userId}.`);

        const updatedUser = this.db.users.change(id, { ...user, subscribedToUserIds: [...user.subscribedToUserIds, userId] });
        if (!(await updatedUser)) throw this.httpErrors.preconditionFailed('Subscribe error.');

        return updatedUser;
      } catch (error) {
        return reply.send(getError(error, fastify));
      }
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      const { userId } = request.body;

      try {
        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.notFound(`The user with id ${id} not found.`);

        const candidate = await this.db.users.findOne({ key: 'id', equals: userId });
        if (!candidate) throw this.httpErrors.notFound(`The user with id ${id} not found.`);

        const isFollower = user.subscribedToUserIds.includes(userId);

        if (!isFollower) throw this.httpErrors.badRequest(`The user with id ${id} is already unsubscribed from the user with id ${userId}.`);

        const updatedUser = this.db.users.change(id, { ...user, subscribedToUserIds: user.subscribedToUserIds.filter((sUserId) => sUserId !== userId) });
        if (!(await updatedUser)) throw this.httpErrors.preconditionFailed('Subscribe error.');

        return updatedUser;
      } catch (error) {
        return reply.send(getError(error, fastify));
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      const newFields = request.body;

      try {
        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.notFound(`The user with id ${id} not found.`);

        const updatedUser = this.db.users.change(id, newFields);
        if (!(await updatedUser)) throw this.httpErrors.preconditionFailed('Update user error.');

        return updatedUser;
      } catch (error) {
        return reply.send(getError(error, fastify));
      }
    }
  );
};

export default plugin;
