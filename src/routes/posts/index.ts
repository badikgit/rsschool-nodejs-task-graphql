import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createPostBodySchema, changePostBodySchema } from './schema';
import type { PostEntity } from '../../utils/DB/entities/DBPosts';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<PostEntity[]> {
    return fastify.db.posts.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { id } = request.params;
      try {
        const post = await this.db.posts.findOne({ key: 'id', equals: id });
        if (!post) throw this.httpErrors.notFound(`The post with id ${id} not found.`);
        return post;
      } catch (error) {
        return reply.send(error);
      }
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createPostBodySchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { body } = request;
      const { userId } = body;
      try {
        const user = await this.db.users.findOne({ key: "id", equals: userId });
        if (!user) throw this.httpErrors.badRequest(`Failed to create post: The user with id ${userId} not found.`);
        const newPost = this.db.posts.create(request.body);
        if (!(await newPost)) throw this.httpErrors.preconditionFailed('Failed to create post.');
        return newPost;
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
    async function (request, reply): Promise<PostEntity> {
      const { id } = request.params;
      try {
        const post = await this.db.posts.findOne({ key: 'id', equals: id });
        if (!post) throw this.httpErrors.badRequest(`Posts delete error: The post with id ${id} not found.`);

        const deletedPost = this.db.posts.delete(id);
        if (!(await deletedPost)) throw this.httpErrors.preconditionFailed('Posts delete error.');
        return deletedPost;
      } catch (error) {
        return reply.send(error);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changePostBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<PostEntity> {
      const { id } = request.params;
      const newFields = request.body;
      try {
        const post = await this.db.posts.findOne({ key: 'id', equals: id });
        if (!post) throw this.httpErrors.badRequest(`Update post error: The post with id ${id} not found.`);

        const updatedPost = this.db.posts.change(id, newFields);
        if (!(await updatedPost)) throw this.httpErrors.preconditionFailed('Update post error.');

        return updatedPost;
      } catch (error) {
        return reply.send(error);
      }
    }
  );
};

export default plugin;
