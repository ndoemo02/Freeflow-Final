export type AmberStatus =
    | 'idle'
    | 'listening'
    | 'thinking'
    | 'presenting'
    | 'error'
    | 'speaking' // Alias dla kompatybilności wstecznej jeśli potrzebne, ale docelowo presenting
    | 'success';
