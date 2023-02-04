import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { changeMemberTypeBodySchema } from './schema';
import type { MemberTypeEntity } from '../../utils/DB/entities/DBMemberTypes';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<
    MemberTypeEntity[]
    > {
    return this.db.memberTypes.findMany();
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      const { id } = request.params;
      try {
        const memberType = await this.db.memberTypes.findOne({ key: 'id', equals: id });
        if (!memberType) throw this.httpErrors.notFound(`Get member type error: The member type with id ${id} not found.`);

        return memberType;
      } catch (error) {
        return reply.send(error);
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeMemberTypeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<MemberTypeEntity> {
      const { id } = request.params;
      const newFields = request.body;
      try {
        const memberType = await this.db.memberTypes.findOne({ key: 'id', equals: id });
        if (!memberType) throw this.httpErrors.badRequest(`Update member type error: The member type with id ${id} not found.`);

        const updatedMemberType = this.db.memberTypes.change(id, newFields);
        if (!(await updatedMemberType)) throw this.httpErrors.preconditionFailed('Update member type error.');

        return updatedMemberType;
      } catch (error) {
        return reply.send(error);
      }
    }
  );
};

export default plugin;
