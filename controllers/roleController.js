import Role from "../models/roleModel.js";

// controllers/roleController.js

 const getMenuByRole = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(400).json({ message: 'Role not provided in token.' });
    }

    // If SuperAdmin requests all roles
    if (req.query.allRoles === 'true' && userRole === 'SuperAdmin') {
      const allRoles = await Role.find();
      return res.status(200).json({ roles: allRoles });
    }

    // Normal behavior: return only current user's menu
    if (userRole === 'SuperAdmin') {
      const superAdminRole = await Role.findOne({ name: 'SuperAdmin' });
      return res.status(200).json({
        menu: superAdminRole.permissions.sort((a, b) => a.order - b.order),
      });
    }

    const role = await Role.findOne({ name: userRole });
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    const filteredMenu = role.permissions
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order);

    res.status(200).json({ menu: filteredMenu });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};



/**
 * Toggle a permission for a role (SuperAdmin only)
 */
 const togglePermission = async (req, res) => {
  try {
    const { roleName, tab } = req.body;

    // Ensure only SuperAdmin can toggle
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ message: 'Only SuperAdmin can update permissions.' });
    }

    const role = await Role.findOne({ name: roleName });
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    const permission = role.permissions.find(p => p.tab === tab);
    if (!permission) {
      return res.status(404).json({ message: 'Permission tab not found.' });
    }

    // Toggle the enabled state
    permission.enabled = !permission.enabled;
    await role.save();

    res.status(200).json({
      message: `Permission for tab "${tab}" has been ${permission.enabled ? 'enabled' : 'disabled'}.`,
      updatedRole: role
    });
  } catch (error) {
    console.error('Error toggling permission:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};



const seedRoles = async (req, res) => {
  try {
    // Clear old roles
    await Role.deleteMany();
    console.log('Old roles cleared.');

    // Base permissions
    const basePermissions = [
      { tab: 'dashboard', label: 'Dashboard', icon: 'TrendingUp', order: 1, enabled: true },
      { tab: 'users', label: 'User Management', icon: 'Users', order: 2, enabled: true },
      { tab: 'pickup-requests', label: 'Pickup Requests', icon: 'FileText', order: 3, enabled: true },
      { tab: 'orders', label: 'Order Management', icon: 'Package', order: 4, enabled: true },
      { tab: 'transactions', label: 'Transactions', icon: 'CreditCard', order: 5, enabled: true },
      { tab: 'rates', label: 'Rate Management', icon: 'Settings', order: 6, enabled: true },
      { tab: 'wallet', label: 'Wallet Credits', icon: 'Wallet', order: 7, enabled: true },
      { tab: 'rbfm', label: 'RBFM', icon: 'Plus', order: 8, enabled: true },
      { tab: 'discounts', label: 'Discounts', icon: 'Percent', order: 9, enabled: true }
    ];

    // Define roles
    const roles = [
      {
        name: 'SuperAdmin',
        description: 'Full system access',
        permissions: basePermissions
      },
      {
        name: 'Operator',
        description: 'Managed by SuperAdmin',
        permissions: basePermissions.map(p => ({ ...p, enabled: false }))
      },
      {
        name: 'PickUp',
        description: 'Managed by SuperAdmin',
        permissions: basePermissions.map(p => ({ ...p, enabled: false }))
      },
      {
        name: 'Finance',
        description: 'Managed by SuperAdmin',
        permissions: basePermissions.map(p => ({ ...p, enabled: false }))
      }
    ];

    // Log each role before seeding
    roles.forEach(role => console.log(`Seeding role: ${role.name}`));

    // Insert roles into DB
    await Role.insertMany(roles);

    console.log('All roles seeded successfully.');
    res.status(201).json({ message: 'Roles seeded successfully.' });
  } catch (error) {
    console.error('Error seeding roles:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};



export { getMenuByRole, seedRoles, togglePermission };