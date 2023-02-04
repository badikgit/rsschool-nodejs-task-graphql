import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (_request, _reply): Promise<UserEntity[]> {
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
        if (!user) throw this.httpErrors.notFound(`Failed to get user: The user with id ${id} not found.`);

        return user;
      } catch (error) {
        return reply.send(error);
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
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      try {
        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.badRequest(`User delete error: The user with id ${id} not found.`);

        const profile = await this.db.profiles.findOne({ key: 'userId', equals: id });
        if (profile) {
          const deletedProfile = await this.db.profiles.delete(profile.id);
          if (!deletedProfile) throw this.httpErrors.preconditionFailed('User delete error: Profile delete error.');
        }

        const posts = await this.db.posts.findMany({ key: 'userId', equals: id });
        if (posts.length) {
          const deletedPosts = await Promise.all(
            posts.map((post) => this.db.posts.delete(post.id))
          );
          if (!deletedPosts.every((post) => post)) throw this.httpErrors.preconditionFailed('User delete error: Posts delete error.');
        }

        const followers = await this.db.users.findMany({ key: 'subscribedToUserIds', equals: [id] });
        if (followers.length) {
          const deletedFollowers = await Promise.all(
            followers.map((follower) =>
              this.db.users.change(follower.id, { subscribedToUserIds: [...follower.subscribedToUserIds].filter((fId) => fId !== id) })
            )
          );
          if (!(deletedFollowers.every((follower) => follower))) throw this.httpErrors.preconditionFailed('User delete error: Followers delete error.');
        }

        const deletedUser = this.db.users.delete(id);
        if (!(await deletedUser)) throw this.httpErrors.preconditionFailed('User delete error.');

        return deletedUser;
      } catch (error) {
        return reply.send(error);
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
        if (id === userId) throw this.httpErrors.badRequest(`Subscribe error: The user can't be subscribed to itself.`);

        const user = await this.db.users.findOne({ key: 'id', equals: id });
        if (!user) throw this.httpErrors.badRequest(`Subscribe error: The user with id ${id} not found.`);

        const candidate = await this.db.users.findOne({ key: 'id', equals: userId });
        if (!candidate) throw this.httpErrors.badRequest(`Subscribe error: The user with id ${id} not found.`);

        const { subscribedToUserIds } = candidate;
        const isFollower = subscribedToUserIds.includes(id);
        if (isFollower) throw this.httpErrors.badRequest(`Subscribe error: The user with id ${userId} is already subscribed to the user with id ${id}.`);

        subscribedToUserIds.push(id);
        const updatedUser = this.db.users.change(userId, candidate);
        if (!(await updatedUser)) throw this.httpErrors.preconditionFailed('Subscribe error.');

        return updatedUser;
      } catch (error) {
        return reply.send(error);
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
        if (!user) throw this.httpErrors.badRequest(`Unsubscribe error: The user with id ${id} not found.`);

        const candidate = await this.db.users.findOne({ key: 'id', equals: userId });
        if (!candidate) throw this.httpErrors.badRequest(`Unsubscribe error: The user with id ${userId} not found.`);

        const { subscribedToUserIds } = candidate;
        const isFollower = subscribedToUserIds.includes(id);
        if (!isFollower) throw this.httpErrors.badRequest(`Unsubscribe error: The user with id ${userId} is already unsubscribed from the user with id ${id}.`);

        const deletedIndex = subscribedToUserIds.indexOf(id);
        subscribedToUserIds.splice(deletedIndex, deletedIndex < 0 ? 0 : 1);
        const updatedUser = this.db.users.change(userId, candidate);
        if (!(await updatedUser)) throw this.httpErrors.preconditionFailed('Unsubscribe error.');

        return updatedUser;
      } catch (error) {
        return reply.send(error);
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
        if (!user) throw this.httpErrors.badRequest(`Update user error. The user with id ${id} not found.`);

        const updatedUser = this.db.users.change(id, newFields);
        if (!(await updatedUser)) throw this.httpErrors.preconditionFailed('Update user error.');

        return updatedUser;
      } catch (error) {
        return reply.send(error);
      }
    }
  );
};

export default plugin;
