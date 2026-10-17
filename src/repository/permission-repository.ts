import { db } from "../prisma/db";
import type {
  UserPermissionModel,
  CreatePermissionData,
  UpdatePermissionData,
} from "../types/permissions";

export class PermissionRepository {
  // ── Queries ──────────────────────────────────────────────────────────────────

  /**
   * Returns all permissions assigned to a given user, ordered by module_name.
   */
  static async findByUserId(userId: string): Promise<UserPermissionModel[]> {
    const permissions = await db.orm.public.UserPermission
      .where({ user_id: userId })
      .orderBy((p) => p.module_name.asc())
      .all();
    return permissions;
  }

  /**
   * Retrieves a single permission by its unique ID.
   */
  static async findById(id: string): Promise<UserPermissionModel | null> {
    const permission = await db.orm.public.UserPermission
      .first({ id });
    return permission ?? null;
  }

  /**
   * Finds a permission for a user by module_name.
   */
  static async findByUserAndModule(
    userId: string,
    moduleName: string
  ): Promise<UserPermissionModel | null> {
    const permission = await db.orm.public.UserPermission
      .where((p) => p.user_id.eq(userId))
      .where((p) => p.module_name.eq(moduleName))
      .first();
    return permission ?? null;
  }

  /**
   * Checks if another permission with the given module_name exists for this user,
   * optionally excluding a specific permission ID (useful when renaming in PATCH).
   */
  static async hasModuleConflict(
    userId: string,
    moduleName: string,
    excludePermissionId?: string
  ): Promise<boolean> {
    let query = db.orm.public.UserPermission
      .where((p) => p.user_id.eq(userId))
      .where((p) => p.module_name.eq(moduleName));

    if (excludePermissionId) {
      query = query.where((p) => p.id.neq(excludePermissionId));
    }

    const match = await query.first();
    return match !== null;
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  /**
   * Creates a single permission record for a user.
   */
  static async createPermission(
    data: CreatePermissionData
  ): Promise<UserPermissionModel> {
    const permission = await db.orm.public.UserPermission.create({
      user_id:    data.user_id,
      module_name: data.module_name,
      can_view:    data.can_view ?? false,
      can_create:  data.can_create ?? false,
      can_edit:    data.can_edit ?? false,
      can_delete:  data.can_delete ?? false,
    });
    return permission;
  }

  /**
   * Atomically replaces all permissions for a user inside a transaction:
   * 1. Deletes all existing permissions for the user
   * 2. Inserts the new permissions list
   * 3. Returns the newly created permissions
   */
  static async bulkReplacePermissions(
    userId: string,
    permissions: Array<{
      module_name: string;
      can_view?: boolean;
      can_create?: boolean;
      can_edit?: boolean;
      can_delete?: boolean;
    }>
  ): Promise<UserPermissionModel[]> {
    return await db.transaction(async (tx) => {
      // 1. Delete all current permissions for this user
      await tx.orm.public.UserPermission.where({ user_id: userId }).delete();

      // 2. Insert new permissions (if any provided)
      for (const item of permissions) {
        await tx.orm.public.UserPermission.create({
          user_id:    userId,
          module_name: item.module_name,
          can_view:    item.can_view ?? false,
          can_create:  item.can_create ?? false,
          can_edit:    item.can_edit ?? false,
          can_delete:  item.can_delete ?? false,
        });
      }

      // 3. Query and return the newly saved records
      const updated = await tx.orm.public.UserPermission
        .where({ user_id: userId })
        .orderBy((p) => p.module_name.asc())
        .all();

      return updated;
    });
  }

  /**
   * Updates an existing permission record by ID.
   */
  static async updatePermission(
    id: string,
    data: UpdatePermissionData
  ): Promise<UserPermissionModel | null> {
    const updated = await db.orm.public.UserPermission
      .where({ id })
      .update(data);
    return updated ?? null;
  }

  /**
   * Deletes a permission record by ID.
   */
  static async deletePermission(id: string): Promise<boolean> {
    await db.orm.public.UserPermission.where({ id }).delete();
    return true;
  }
}
