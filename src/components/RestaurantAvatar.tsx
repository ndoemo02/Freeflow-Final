import React, { useEffect, useMemo, useState } from 'react';

interface RestaurantAvatarProps {
    item: any;
    size?: number;
    className?: string;
}

/**
 * Resolves the best available image candidates for a restaurant object.
 * Priority aligned with card/select views: img → image_url → image → photo_url → photo_gallery[*]
 */
function resolveRestaurantImageCandidates(item: any): string[] {
    if (!item) return [];
    const primary = [item.img, item.image_url, item.image, item.photo_url];
    const gallery = Array.isArray(item.photo_gallery)
        ? item.photo_gallery
        : (typeof item.photo_gallery === 'string'
            ? String(item.photo_gallery).split(/[;,]/).map((entry) => entry.trim()).filter(Boolean)
            : []);
    const merged = [...primary, ...gallery]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    return Array.from(new Set(merged));
}

export default function RestaurantAvatar({ item, size = 44, className = "" }: RestaurantAvatarProps) {
    const initial = (item?.name || 'R')[0].toUpperCase();
    const candidates = useMemo(() => resolveRestaurantImageCandidates(item), [item]);
    const [candidateIndex, setCandidateIndex] = useState(0);

    useEffect(() => {
        setCandidateIndex(0);
    }, [item]);

    const src = candidates[candidateIndex] || null;

    if (src) {
        return (
            <img
                src={src}
                alt={item?.name || ''}
                className={`h-full w-full object-cover ${className}`}
                onError={(e) => {
                    e.preventDefault();
                    setCandidateIndex((prev) => prev + 1);
                }}
            />
        );
    }

    return (
        <div
            className={`flex h-full w-full items-center justify-center text-sm font-bold text-white/90 ${className}`}
            style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.35) 0%, rgba(6,10,22,0.85) 100%)',
                fontSize: size > 30 ? 'inherit' : '10px'
            }}
        >
            {initial}
        </div>
    );
}
