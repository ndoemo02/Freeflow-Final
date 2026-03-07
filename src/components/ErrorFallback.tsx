import React from 'react';

export default function ErrorFallback({ message, onRetry }: { message?: string; onRetry?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
            <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Błąd pobierania danych</h3>
            <p className="text-gray-400 mb-6">{message || 'Nie udało się załadować zawartości strony. Spróbuj ponownie później.'}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-black font-bold rounded-full transition-colors"
                >
                    Spróbuj ponownie
                </button>
            )}
        </div>
    );
}
