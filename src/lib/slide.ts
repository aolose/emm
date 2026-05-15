/**
 * Calculate translate3d style for slide-panel navigation.
 * `isSmall` should be the reactive $small value from the store.
 */
export function slideSty(view: number, panels: number, isSmall: boolean): string {
	if (isSmall) {
		return `transform:translate3d(${((-view * 100) / panels).toFixed(4)}%,0,0)`;
	}
	return '';
}

/**
 * Transition curve used for slide panels — smoother than ease-in-out.
 */
export const PANEL_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
