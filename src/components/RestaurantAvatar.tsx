import React from 'react';

interface RestaurantAvatarProps {
    item: any;
    size?: number;
    className?: string;
}

export default function RestaurantAvatar({ item, size = 44, className = "" }: RestaurantAvatarProps) {
    const initial = (item?.name || 'R')[0].toUpperCase();
    
    if (item?.image_url) {
        return (
            <img 
                src={item.image_url} 
                alt={item.name} 
                className={`h-full w-full object-cover ${className}`} 
            />
        );
    }
    
    if (item?.image) {
        return (
            <img 
                src={item.image} 
                alt={item.name} 
                className={`h-full w-full object-cover ${className}`} 
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
