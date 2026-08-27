import { describe, it, expect } from 'vitest';
import { portalConfig } from '../lib/config';

/**
 * Test Suite: Farmer Portal Navigation Configuration
 * 
 * Verifies that the FARMER navigation contains expected items
 * in the required order with no extra items.
 */
describe('Farmer Portal Navigation Configuration', () => {
    const farmerNav = portalConfig.FARMER.navigation;

    it('should contain exactly 12 navigation items', () => {
        expect(farmerNav).toHaveLength(12);
    });

    it('should have items in the exact required order', () => {
        const expectedOrder = [
            'dashboard',
            'farms',
            'seasons',
            'suppliers-supplies',
            'product-warehouse',
            'marketplace-workspace',
            'documents',
            'vietgap-workspace',
            'farm-documents',
            'ai-assistant',
            'chat',
            'notifications',
        ];

        const actualOrder = farmerNav.map((item) => item.id);
        expect(actualOrder).toEqual(expectedOrder);
    });

    it('should have all required properties for each item', () => {
        farmerNav.forEach((item) => {
            expect(item).toHaveProperty('id');
            expect(item).toHaveProperty('label');
            expect(item).toHaveProperty('icon');
            expect(typeof item.id).toBe('string');
            expect(typeof item.label).toBe('string');
            const iconType = typeof item.icon;
            expect(['function', 'object']).toContain(iconType); // Lucide icons are forwardRef objects
        });
    });

    it('should have correct labels for key items', () => {
        const itemLabels = farmerNav.reduce((acc, item) => {
            acc[item.id] = item.label;
            return acc;
        }, {} as Record<string, string>);

        expect(itemLabels['dashboard']).toBe('Dashboard');
        expect(itemLabels['marketplace-workspace']).toBe('Marketplace Workspace');
        expect(itemLabels['farms']).toBe('Farms & Plots');
        expect(itemLabels['seasons']).toBe('Seasons');
        expect(itemLabels['suppliers-supplies']).toBe('Suppliers & Supplies');
        expect(itemLabels['product-warehouse']).toBe('Product Warehouse');
        expect(itemLabels['documents']).toBe('System Documents');
        expect(itemLabels['vietgap-workspace']).toBe('VietGAP Workspace');
        expect(itemLabels['farm-documents']).toBe('VietGAP Documents');
        expect(itemLabels['chat']).toBe('Chat');
        expect(itemLabels['notifications']).toBe('Notifications');
        expect(itemLabels['ai-assistant']).toBe('AI Assistant');
    });

    it('should not contain removed items (workspace modules and legacy routes)', () => {
        const ids = farmerNav.map((item) => item.id);
        expect(ids).not.toContain('tasks');
        expect(ids).not.toContain('field-logs');
        expect(ids).not.toContain('expenses');
        expect(ids).not.toContain('harvest');
        expect(ids).not.toContain('crops');
        expect(ids).not.toContain('plots'); // plots is now part of 'farms'
        expect(ids).not.toContain('labor-management'); // labor management moved into season workspace
        expect(ids).not.toContain('user-guide'); // merged into system documents
    });

    it('should have unique IDs for all items', () => {
        const ids = farmerNav.map((item) => item.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });
});

describe('Admin Portal Navigation Configuration', () => {
    const adminNav = portalConfig.ADMIN.navigation;

    it('should route account management through users and roles only', () => {
        const ids = adminNav.map((item) => item.id);

        expect(ids).toContain('users-roles');
        expect(ids).not.toContain('buyers');
        expect(ids).not.toContain('farmers');
        expect(ids).not.toContain('farm-documents');
    });
});
