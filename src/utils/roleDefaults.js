import { getNavGroups } from "../constants/navGroups";

// A role's built-in default modules: the module pages whose `roles` list
// in the nav config includes the role. Used until a superadmin saves the
// role's defaults on Administrator -> Role Access.
export const builtInRoleKeys = (role) => {
  const keys = new Set();
  if (!role) return keys;
  getNavGroups(role).forEach((group) =>
    (group.children || []).forEach((item) => {
      if (item.moduleKey && item.roles?.includes(role)) keys.add(item.moduleKey);
    }),
  );
  return keys;
};

// The role's defaults in effect: saved on Role Access (`saved` = the
// role's entry from getRoleDefaults().roles), else the built-in ones.
export const effectiveRoleKeys = (role, saved) =>
  saved ? new Set(saved.module_keys || []) : builtInRoleKeys(role);

export const effectiveRoleReadOnly = (saved) => new Set(saved?.read_only_keys || []);
