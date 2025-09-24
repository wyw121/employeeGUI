// Allow importing global CSS files (side-effect imports)
declare module '*.css' {
	const content: string;
	export default content;
}
