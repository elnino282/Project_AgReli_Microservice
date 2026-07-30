/**
 * AddressDisplay Component
 * 
 * Displays Vietnamese address with loading state
 */

import { useAddressDisplay } from './useAddressDisplay';
import { Skeleton } from '../skeleton';
import { MapPin } from 'lucide-react';

export interface AddressDisplayProps {
    /**
     * Ward code to display address for
     */
    wardCode?: number | null;

    /**
     * Ward name if already available (skips API call if both wardName and provinceName are provided)
     */
    wardName?: string | null;

    /**
     * Province name if already available (skips API call if both wardName and provinceName are provided)
     */
    provinceName?: string | null;
    
    /**
     * Fallback text when no address available
     */
    fallback?: string;
    
    /**
     * Display variant
     */
    variant?: 'full' | 'compact' | 'id-only';
    
    /**
     * Whether to show the map pin icon
     */
    showIcon?: boolean;
    
    /**
     * Additional CSS classes
     */
    className?: string;
}

/**
 * AddressDisplay Component
 * 
 * Automatically fetches and displays Vietnamese address from ward code
 * 
 * @example
 * ```tsx
 * // Full address display
 * <AddressDisplay wardCode={farm.addressId} />
 * 
 * // Compact display
 * <AddressDisplay wardCode={farm.addressId} variant="compact" />
 * 
 * // ID only fallback
 * <AddressDisplay wardCode={farm.addressId} variant="id-only" />
 * ```
 */
export function AddressDisplay({
    wardCode,
    wardName,
    provinceName,
    fallback = '—',
    variant = 'full',
    showIcon = false,
    className = '',
}: AddressDisplayProps) {
    const hasPreloadedNames = Boolean(wardName || provinceName);
    
    const { formattedAddress, isLoading, isError } = useAddressDisplay({
        wardCode,
        enabled: variant !== 'id-only' && !hasPreloadedNames,
    });
    
    let displayText = '';
    
    if (variant === 'id-only') {
        displayText = `#${wardCode}`;
    } else if (hasPreloadedNames) {
        if (variant === 'compact') {
            displayText = provinceName || wardName || '';
        } else {
            const parts = [wardName, provinceName].filter(Boolean);
            displayText = parts.join(', ');
        }
    } else if (formattedAddress) {
        displayText = variant === 'compact'
            ? formattedAddress.split(',').slice(-1).join(',').trim()
            : formattedAddress;
    }
    
    // Loading state
    if (isLoading && !hasPreloadedNames && variant !== 'id-only') {
        return <Skeleton className={`h-4 w-32 ${className}`} />;
    }
    
    // Error or no data - show fallback
    if (!displayText && wardCode) {
        if (variant === 'id-only') {
            return (
                <span className={className}>
                    {showIcon && <MapPin className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
                    #{wardCode}
                </span>
            );
        }
        
        // For full/compact, show ID as fallback
        return (
            <span className={`text-gray-500 ${className}`}>
                {showIcon && <MapPin className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
                Address ID: #{wardCode}
            </span>
        );
    }
    
    // No ward code provided
    if (!displayText && !wardCode) {
        return <span className={`text-gray-400 ${className}`}>{fallback}</span>;
    }
    
    return (
        <span className={className}>
            {showIcon && <MapPin className="inline-block w-3 h-3 mr-1 -mt-0.5" />}
            {displayText}
        </span>
    );
}




