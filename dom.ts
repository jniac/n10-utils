
export function someAncestorVerify(scope: HTMLElement | null, predicate: (element: Element) => boolean): boolean {
	while (scope) {
		if (predicate(scope)) {
			return true;
		}
		scope = scope.parentElement;
	}
	return false;
}

export function isAncestor(parent: Element, child: any): boolean {
	let scope = child?.parentElement;
	while (scope) {
		if (parent === scope) {
			return true;
		}
		scope = scope.parentElement;
	}
	return false;
}

export function isSameOrAncestor(parent: Element, child: any): boolean {
	return parent === child || isAncestor(parent, child);
}
