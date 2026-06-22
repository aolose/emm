import { page } from '$app/stores';
import type Clipboard from 'clipboard';
export const act = (node: HTMLAnchorElement, exact = true) => {
	const cls = 'act';
	const u = page.subscribe((p) => {
		const target = node.getAttribute('href') || '';
		const cur = p.url.pathname;
		const match = exact ? cur === target : cur.startsWith(target);
		if (match) {
			node.classList.add(cls);
		} else {
			node.classList.remove(cls);
		}
	});
	return {
		destroy: u
	};
};

export const imageViewer = async (node: HTMLElement, slug: string) => {
	let observer: MutationObserver | null = null;
	let preparing = false;

	const prepareElements = () => {
		if (preparing) return;
		preparing = true;

		node.querySelectorAll('img, .mermaid-svg, .mermaid-rendered').forEach((el) => {
			if (el.closest('a[data-custom-viewer]')) return;

			const a = document.createElement('a');
			a.dataset.customViewer = 'active';
			a.style.display = 'block';
			a.style.cursor = 'zoom-in';

			el.parentNode!.insertBefore(a, el);
			a.appendChild(el);
		});

		preparing = false;
	};

	prepareElements();

	const openFullscreenViewer = (clickedAnchor: HTMLElement) => {
		const targetElement = clickedAnchor.querySelector('img, svg') as HTMLElement;
		if (!targetElement) return;

		// 📍 FIRST: Record position and dimensions of target item
		const origRect = targetElement.getBoundingClientRect();
		const origCenterX = origRect.left + origRect.width / 2;
		const origCenterY = origRect.top + origRect.height / 2;

		const overlay = document.createElement('div');
		overlay.style.cssText =
			'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:999999; display:flex; align-items:center; justify-content:center; overflow:hidden; user-select:none; touch-action:none; opacity:0; transition:opacity 0.35s cubic-bezier(0.25, 1, 0.5, 1);';

		const transformContainer = document.createElement('div');
		// ✅ CHANGED: Shift origin back to standard true center
		transformContainer.style.cssText =
			'transform-origin:center center; will-change:transform; display:flex; align-items:center; justify-content:center; max-width:92%; max-height:92%; cursor:grab;';

		const isSvg = targetElement.tagName.toLowerCase() === 'svg';
		let clonedElement: HTMLElement;
		if (isSvg) {
			clonedElement = targetElement.cloneNode(true) as HTMLElement;
			const originalWidth =
				targetElement.getAttribute('width') ||
				targetElement.getBoundingClientRect().width.toString();
			const originalHeight =
				targetElement.getAttribute('height') ||
				targetElement.getBoundingClientRect().height.toString();
			if (!clonedElement.getAttribute('viewBox')) {
				clonedElement.setAttribute('viewBox', `0 0 ${originalWidth} ${originalHeight}`);
			}
			clonedElement.removeAttribute('width');
			clonedElement.removeAttribute('height');
			clonedElement.style.cssText =
				'width: 100vw; height: 100vh; max-width: none; max-height: none; display:block; pointer-events: none;';
			clonedElement.setAttribute('shape-rendering', 'geometricPrecision');
			clonedElement.setAttribute('text-rendering', 'geometricPrecision');
			transformContainer.style.width = '100vw';
			transformContainer.style.height = '100vh';
			transformContainer.style.maxWidth = 'none';
			transformContainer.style.maxHeight = 'none';
		} else {
			clonedElement = targetElement.cloneNode(true) as HTMLImageElement;
			clonedElement.style.cssText =
				'max-width:100%; max-height:100%; object-fit:contain; pointer-events:none;';
		}

		transformContainer.appendChild(clonedElement);
		overlay.appendChild(transformContainer);
		document.body.appendChild(overlay);

		if (isSvg) {
			type SvgViewBox = {
				x: number;
				y: number;
				width: number;
				height: number;
			};

			const svgElement = clonedElement as unknown as SVGSVGElement;
			const parseViewBox = (): SvgViewBox => {
				const parts = (svgElement.getAttribute('viewBox') || '')
					.trim()
					.split(/[\s,]+/)
					.map(Number);
				if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
					return {
						x: parts[0],
						y: parts[1],
						width: parts[2],
						height: parts[3]
					};
				}

				const rect = targetElement.getBoundingClientRect();
				return {
					x: 0,
					y: 0,
					width: rect.width || window.innerWidth,
					height: rect.height || window.innerHeight
				};
			};

			const baseViewBox = parseViewBox();
			let viewBox: SvgViewBox = { ...baseViewBox };
			let zoom = 1;
			let rafId: number | null = null;
			const activePointers: PointerEvent[] = [];
			let lastCenter = { x: 0, y: 0 };
			let lastDistance = 0;
			let hasMovedSignificant = false;

			const applyViewBox = () => {
				svgElement.setAttribute(
					'viewBox',
					`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
				);
				rafId = null;
			};

			const requestRender = () => {
				if (rafId === null) {
					rafId = requestAnimationFrame(applyViewBox);
				}
			};

			const getRenderScale = () => {
				const rect = svgElement.getBoundingClientRect();
				return Math.min(rect.width / viewBox.width, rect.height / viewBox.height) || 1;
			};

			const clientToSvg = (clientX: number, clientY: number) => {
				const rect = svgElement.getBoundingClientRect();
				const renderScale = getRenderScale();
				const renderedWidth = viewBox.width * renderScale;
				const renderedHeight = viewBox.height * renderScale;
				const offsetX = (rect.width - renderedWidth) / 2;
				const offsetY = (rect.height - renderedHeight) / 2;

				return {
					x: viewBox.x + (clientX - rect.left - offsetX) / renderScale,
					y: viewBox.y + (clientY - rect.top - offsetY) / renderScale
				};
			};

			const panBy = (movementX: number, movementY: number) => {
				const renderScale = getRenderScale();
				viewBox.x -= movementX / renderScale;
				viewBox.y -= movementY / renderScale;
			};

			const zoomAt = (clientX: number, clientY: number, targetZoom: number) => {
				const nextZoom = Math.max(0.4, Math.min(targetZoom, 30));
				const focalPoint = clientToSvg(clientX, clientY);
				const focalRatioX = (focalPoint.x - viewBox.x) / viewBox.width;
				const focalRatioY = (focalPoint.y - viewBox.y) / viewBox.height;
				const nextWidth = baseViewBox.width / nextZoom;
				const nextHeight = baseViewBox.height / nextZoom;

				viewBox = {
					x: focalPoint.x - nextWidth * focalRatioX,
					y: focalPoint.y - nextHeight * focalRatioY,
					width: nextWidth,
					height: nextHeight
				};
				zoom = nextZoom;
			};

			applyViewBox();
			requestAnimationFrame(() => {
				overlay.style.opacity = '1';
			});

			overlay.addEventListener(
				'wheel',
				(e: WheelEvent) => {
					e.preventDefault();
					const zoomFactor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
					zoomAt(e.clientX, e.clientY, zoom * zoomFactor);
					requestRender();
				},
				{ passive: false }
			);

			transformContainer.addEventListener('pointerdown', (e: PointerEvent) => {
				e.preventDefault();
				activePointers.push(e);
				transformContainer.style.cursor = 'grabbing';
				hasMovedSignificant = false;

				if (activePointers.length === 1) {
					lastCenter = { x: e.clientX, y: e.clientY };
				} else if (activePointers.length === 2) {
					lastDistance = Math.hypot(
						activePointers[1].clientX - activePointers[0].clientX,
						activePointers[1].clientY - activePointers[0].clientY
					);
					lastCenter = {
						x: (activePointers[0].clientX + activePointers[1].clientX) / 2,
						y: (activePointers[0].clientY + activePointers[1].clientY) / 2
					};
				}
			});

			const handlePointerMove = (e: PointerEvent) => {
				const index = activePointers.findIndex((p) => p.pointerId === e.pointerId);
				if (index === -1) return;
				activePointers[index] = e;

				if (activePointers.length === 1) {
					const p = activePointers[0];
					const movementX = p.clientX - lastCenter.x;
					const movementY = p.clientY - lastCenter.y;

					if (Math.hypot(movementX, movementY) > 3) {
						hasMovedSignificant = true;
					}

					panBy(movementX, movementY);
					lastCenter = { x: p.clientX, y: p.clientY };
				} else if (activePointers.length === 2) {
					hasMovedSignificant = true;
					const p1 = activePointers[0];
					const p2 = activePointers[1];
					const currentDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
					const currentCenter = {
						x: (p1.clientX + p2.clientX) / 2,
						y: (p1.clientY + p2.clientY) / 2
					};
					const zoomFactor = currentDistance / lastDistance;

					zoomAt(currentCenter.x, currentCenter.y, zoom * zoomFactor);
					panBy(currentCenter.x - lastCenter.x, currentCenter.y - lastCenter.y);
					lastDistance = currentDistance;
					lastCenter = currentCenter;
				}

				requestRender();
			};

			const handlePointerUp = (e: PointerEvent) => {
				const index = activePointers.findIndex((p) => p.pointerId === e.pointerId);
				if (index !== -1) activePointers.splice(index, 1);

				if (activePointers.length === 0) {
					transformContainer.style.cursor = 'grab';
				} else if (activePointers.length === 1) {
					const remaining = activePointers[0];
					lastCenter = { x: remaining.clientX, y: remaining.clientY };
				}
			};

			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp);
			window.addEventListener('pointercancel', handlePointerUp);

			const cleanup = () => {
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('pointerup', handlePointerUp);
				window.removeEventListener('pointercancel', handlePointerUp);
			};

			const closeViewer = () => {
				if (rafId) cancelAnimationFrame(rafId);
				cleanup();
				overlay.style.opacity = '0';
				overlay.addEventListener(
					'transitionend',
					() => {
						overlay.remove();
					},
					{ once: true }
				);
			};

			overlay.addEventListener('click', (e: MouseEvent) => {
				if (e.target === overlay || !hasMovedSignificant) {
					closeViewer();
				}
			});

			return;
		}

		// ---- State Tracking Coordinates ----
		let scale = 1;
		let translateX = 0;
		let translateY = 0;

		const activePointers: PointerEvent[] = [];
		let lastCenter = { x: 0, y: 0 };
		let lastDistance = 0;
		let hasMovedSignificant = false;
		let rafId: number | null = null;

		// 📍 LAST: Find structural target size values when scale = 1 at viewport center
		const destRect = transformContainer.getBoundingClientRect();
		const viewCenterX = window.innerWidth / 2;
		const viewCenterY = window.innerHeight / 2;

		// 📍 INVERT: Calculate sizing changes relative to structural centers
		const startScaleX = origRect.width / destRect.width;
		const startScaleY = origRect.height / destRect.height;
		const startScale = Math.min(startScaleX, startScaleY);

		// With a center origin, offset is simply distance from original layout center to screen center
		const startX = origCenterX - viewCenterX;
		const startY = origCenterY - viewCenterY;

		// Snap to source location instantly
		translateX = startX;
		translateY = startY;
		scale = startScale;

		transformContainer.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;

		const render = () => {
			transformContainer.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
			rafId = null;
		};

		const requestRender = () => {
			if (rafId === null) {
				rafId = requestAnimationFrame(render);
			}
		};

		// 📍 PLAY: Animate target forward
		requestAnimationFrame(() => {
			overlay.style.opacity = '1';
			transformContainer.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';

			// Animate toward baseline zero offset positions (Dead Center)
			translateX = 0;
			translateY = 0;
			scale = 1;

			requestRender();
		});

		// Remove transition layout properties upon loading execution completion
		setTimeout(() => {
			if (activePointers.length === 0) {
				transformContainer.style.transition = 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)';
			}
		}, 350);

		// 🖥️ Center-Aware Mouse Wheel Zoom
		overlay.addEventListener(
			'wheel',
			(e: WheelEvent) => {
				e.preventDefault();
				transformContainer.style.transition = 'transform 0.12s cubic-bezier(0.25, 1, 0.5, 1)';

				const zoomFactor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
				const targetScale = Math.max(0.4, Math.min(scale * zoomFactor, 15));

				const mouseX = e.clientX;
				const mouseY = e.clientY;

				// ✅ ADJUSTED MATH: Adjust mouse tracking offsets to fit center-origin layouts
				translateX =
					mouseX - viewCenterX - (mouseX - viewCenterX - translateX) * (targetScale / scale);
				translateY =
					mouseY - viewCenterY - (mouseY - viewCenterY - translateY) * (targetScale / scale);
				scale = targetScale;

				requestRender();
			},
			{ passive: false }
		);

		// 📱 Universal Gesture Inputs
		transformContainer.addEventListener('pointerdown', (e: PointerEvent) => {
			e.preventDefault();
			transformContainer.style.transition = 'none';
			activePointers.push(e);
			transformContainer.style.cursor = 'grabbing';
			hasMovedSignificant = false;

			if (activePointers.length === 1) {
				lastCenter = { x: e.clientX, y: e.clientY };
			} else if (activePointers.length === 2) {
				lastDistance = Math.hypot(
					activePointers[1].clientX - activePointers[0].clientX,
					activePointers[1].clientY - activePointers[0].clientY
				);
				lastCenter = {
					x: (activePointers[0].clientX + activePointers[1].clientX) / 2,
					y: (activePointers[0].clientY + activePointers[1].clientY) / 2
				};
			}
		});

		window.addEventListener('pointermove', (e: PointerEvent) => {
			const index = activePointers.findIndex((p) => p.pointerId === e.pointerId);
			if (index === -1) return;
			activePointers[index] = e;

			if (activePointers.length === 1) {
				const p = activePointers[0];
				const movementX = p.clientX - lastCenter.x;
				const movementY = p.clientY - lastCenter.y;

				if (Math.hypot(movementX, movementY) > 3) {
					hasMovedSignificant = true;
				}

				translateX += movementX;
				translateY += movementY;
				lastCenter = { x: p.clientX, y: p.clientY };
			} else if (activePointers.length === 2) {
				hasMovedSignificant = true;
				const p1 = activePointers[0];
				const p2 = activePointers[1];

				const currentDistance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
				const currentCenter = {
					x: (p1.clientX + p2.clientX) / 2,
					y: (p1.clientY + p2.clientY) / 2
				};

				const zoomFactor = currentDistance / lastDistance;
				const targetScale = Math.max(0.4, Math.min(scale * zoomFactor, 15));

				// ✅ ADJUSTED MATH: Tracking pinch centers across localized focal coordinates
				translateX =
					currentCenter.x -
					viewCenterX -
					(currentCenter.x - viewCenterX - translateX) * (targetScale / scale);
				translateY =
					currentCenter.y -
					viewCenterY -
					(currentCenter.y - viewCenterY - translateY) * (targetScale / scale);

				translateX += currentCenter.x - lastCenter.x;
				translateY += currentCenter.y - lastCenter.y;

				scale = targetScale;
				lastDistance = currentDistance;
				lastCenter = currentCenter;
			}

			requestRender();
		});

		const handlePointerUp = (e: PointerEvent) => {
			const index = activePointers.findIndex((p) => p.pointerId === e.pointerId);
			if (index !== -1) activePointers.splice(index, 1);

			if (activePointers.length === 0) {
				transformContainer.style.cursor = 'grab';
				transformContainer.style.transition = 'transform 0.22s cubic-bezier(0.25, 1, 0.5, 1)';
			} else if (activePointers.length === 1) {
				const remaining = activePointers[0];
				lastCenter = { x: remaining.clientX, y: remaining.clientY };
			}
		};

		window.addEventListener('pointerup', handlePointerUp);
		window.addEventListener('pointercancel', handlePointerUp);

		// 📍 REVERSE PLAY: Smooth exit to target element position
		const closeViewer = () => {
			if (rafId) cancelAnimationFrame(rafId);

			overlay.style.opacity = '0';
			transformContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';

			translateX = startX;
			translateY = startY;
			scale = startScale;

			requestRender();

			overlay.addEventListener(
				'transitionend',
				() => {
					overlay.remove();
				},
				{ once: true }
			);
		};

		overlay.addEventListener('click', (e: MouseEvent) => {
			if (e.target === overlay || !hasMovedSignificant) {
				closeViewer();
			}
		});
	};

	const handleNodeClick = (e: MouseEvent) => {
		const anchor = (e.target as HTMLElement).closest('a[data-custom-viewer="active"]');
		if (anchor) {
			e.preventDefault();
			e.stopPropagation();
			openFullscreenViewer(anchor as HTMLElement);
		}
	};

	node.addEventListener('click', handleNodeClick, true);

	observer = new MutationObserver(() => {
		prepareElements();
	});
	observer.observe(node, { childList: true, subtree: true });

	return {
		destroy: () => {
			observer?.disconnect();
			node.removeEventListener('click', handleNodeClick, true);
		}
	};
};



export const inner = (node: HTMLElement, child: unknown) => {
	const getEl = (child: unknown) => {
		let el: HTMLElement | Text;
		if (child instanceof HTMLElement) {
			el = child;
		} else el = document.createTextNode(child as string);
		return el;
	};
	let el = getEl(child);
	if (child) node.appendChild(el);
	return {
		update(child: unknown) {
			if (el && node.contains(el)) {
				const e = getEl(child);
				el.replaceWith(e);
				el = e;
			} else {
				el = node.appendChild(getEl(child));
			}
		}
	};
};

export async function clipboard(n: HTMLElement, cb: () => void) {
	const C = (await import('clipboard')).default;
	let c: Clipboard;
	const r = (n: HTMLElement, cb: () => void) => {
		if (c) c.destroy();
		c = new C(n, {
			text(target) {
				return target.getAttribute('data-text') || '';
			}
		});
		c.on('success', cb);
	};
	r(n, cb);
	return {
		update: r,
		destroy() {
			if (c) c.destroy();
		}
	};
}
