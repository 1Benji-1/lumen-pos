import { expect, it } from 'vitest'
import { getAssignableStaffRoles } from './assignableStaffRoles'

it('offers entry-capable roles to the owner of a native Salud organization', () => {
  expect(getAssignableStaffRoles(true, 'health', false)).toEqual(['admin', 'owner'])
})

it('omits invitations when an administrator has no assignable roles for native Salud', () => {
  expect(getAssignableStaffRoles(false, 'health', false)).toEqual([])
})

it('preserves invitation options for migrated clinics using the previous catalog', () => {
  expect(getAssignableStaffRoles(false, 'health', true)).toEqual(['cashier', 'stock_clerk'])
})
