export const parser = '@typescript-eslint/parser';
export const parserOptions = {
	ecmaVersion: 2020,
	sourceType: 'module',
};
export const eslintExtends = [
	'eslint:recommended',
	'plugin:@typescript-eslint/recommended',
	'plugin:prettier/recommended',
];
export const rules = {
	'prettier/prettier': 'error',
	'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
	'@typescript-eslint/no-explicit-any': 'off',
};