import { Material } from "babylonjs/core/Materials/material";
import { MaterialDefines } from "babylonjs/core/Materials/materialDefines";
import { MaterialPluginBase } from "babylonjs/core/Materials/materialPluginBase";
import { RegisterMaterialPlugin } from "babylonjs/core/Materials/materialPluginManager";
import { Mesh } from "babylonjs/core/Meshes/mesh";
import { Scene } from "babylonjs/core/scene";
import { Nullable } from "babylonjs/core/types";

/**
 * Static props that every child plugin should define on its side.
 */
export type PluginStaticProps = Readonly<{
	priority: number;
	pluginName: string;
	className: string;
	instanceName: string;
	defineName: string;
}>;

export type ShaderType =
	| "vertex"
	| "fragment"

export type ShaderCode<T extends string = string> = Partial<Record<T, string>>;

export type ShaderVertexEntry =
	// Vertex:
	| "CUSTOM_VERTEX_BEGIN"
	| "CUSTOM_VERTEX_DEFINITIONS"
	| "CUSTOM_VERTEX_MAIN_BEGIN"
	| "CUSTOM_VERTEX_UPDATE_POSITION"
	| "CUSTOM_VERTEX_UPDATE_NORMAL"
	| "CUSTOM_VERTEX_UPDATE_WORLDPOS"
	| "CUSTOM_VERTEX_MAIN_END"

export type ShaderFragmentEntry =
	// Fragment:
	| "CUSTOM_FRAGMENT_BEGIN"
	| "CUSTOM_IMAGEPROCESSINGFUNCTIONS_DEFINITIONS"
	| "CUSTOM_IMAGEPROCESSINGFUNCTIONS_UPDATERESULT_ATSTART"
	| "CUSTOM_IMAGEPROCESSINGFUNCTIONS_UPDATERESULT_ATEND"
	| "CUSTOM_FRAGMENT_DEFINITIONS"
	| "CUSTOM_FRAGMENT_UPDATE_ALBEDO"
	| "CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS"
	| "CUSTOM_FRAGMENT_MAIN_BEGIN"
	| "CUSTOM_FRAGMENT_UPDATE_ALPHA"
	| "CUSTOM_FRAGMENT_BEFORE_LIGHTS"
	| "CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION"
	| "CUSTOM_FRAGMENT_BEFORE_FOG"
	| "CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR"
	| "CUSTOM_FRAGMENT_MAIN_END"

export type UniformType =
	| "float"
	| "vec2"
	| "vec3"
	| "vec4"
	| "mat3"
	| "mat4"

export type UniformDeclaration = {
	name: string;
	size?: number;
	type?: UniformType;
	arraySize?: number;
};

export type GetUniformsReturnType = {
	ubo?: UniformDeclaration[];
	vertex?: string;
	fragment?: string;
};

export type DeclareUniformsReturnType = Record<string, UniformType>;

const uniformTypeSizeMap: Record<UniformType, number> = {
	float: 1,
	vec2: 2,
	vec3: 3,
	vec4: 4,
	mat3: 9,
	mat4: 16,
};

function wrapCustomCodeWithDefine(code: ShaderCode, defineName: string): ShaderCode {
	return Object.fromEntries(Object.entries(code).map(([key, codeString]) => {
		const str = `\n#ifdef ${defineName}\n`
			+ codeString
			+ "\n#endif\n";
		return [key, str];
	}));
}

export class MaterialPluginDeclarativeBase extends MaterialPluginBase {

	static props: PluginStaticProps;

	static AutoRegister() {
		const {
			className,
			instanceName,
		} = this.props;
		const Plugin = this;
		RegisterMaterialPlugin(className, material => {
			const plugin = new Plugin(material);
			Object.assign(material, { [instanceName]: plugin });
			return plugin;
		});
	}

	static getPlugin(material: Material): MaterialPluginDeclarativeBase | null {
		const { className } = this.props;
		const plugin = material.pluginManager?.getPlugin(className) ?? null;
		return plugin ? plugin as MaterialPluginDeclarativeBase : null;
	}

	static enablePlugin(material: Material): MaterialPluginDeclarativeBase | null {
		return this.getPlugin(material)?.enable() ?? null;
	}

	static disablePlugin(material: Material): MaterialPluginDeclarativeBase | null {
		return this.getPlugin(material)?.disable() ?? null;
	}

	static togglePlugin(material: Material): MaterialPluginDeclarativeBase | null {
		return this.getPlugin(material)?.toggle() ?? null;
	}

	_enabled = false;

	setEnabled(value: boolean): this {
		if (this._enabled === value) {
			return this;
		}
		this._enabled = value;
		this.markAllDefinesAsDirty();
		this._enable(this._enabled);
		return this;
	}

	enable(): this {
		return this.setEnabled(true);
	}

	disable(): this {
		return this.setEnabled(false);
	}

	toggle(value: boolean = !this.enabled): this {
		return value ? this.enable() : this.disable();
	}

	getStaticProps(): PluginStaticProps {
		return (this.constructor as typeof MaterialPluginDeclarativeBase).props;
	}

	getClassName() {
		return this.constructor.name;
	}

	// Also, you should always associate a define with your plugin because the list of defines (and their values)
	// is what triggers a recompilation of the shader: a shader is recompiled only if a value of a define changes.
	prepareDefines(defines: MaterialDefines, _scene: Scene, _mesh: Mesh) {
		// Here we enable / disable the define.
		const { defineName } = (this.constructor as typeof MaterialPluginDeclarativeBase).props;
		defines[defineName] = this.enabled;
	}

	/**
	 * @virtual
	 */
	declareUniforms(): DeclareUniformsReturnType {
		return {};
	}

	getUniforms(): GetUniformsReturnType {
		if (this.enabled) {
			const declaration = this.declareUniforms();
			const glslUniforms = Object.entries(declaration).map(([name, type]) => {
				return `uniform ${type} ${name};`;
			}).join("\n");
			return {
				ubo: Object.entries(declaration).map(([name, type]) => {
					return {
						name,
						type,
						size: uniformTypeSizeMap[type],
					};
				}),
				vertex: glslUniforms,
				fragment: glslUniforms,
			};
		} else {
			return {};
		}
	}

	/**
	 * @virtual
	 */
	declareVertexCode(): ShaderCode<ShaderVertexEntry> {
		return {};
	}

	/**
	 * @virtual
	 */
	declareFragmentCode(): ShaderCode<ShaderFragmentEntry> {
		return {};
	}

	getCustomCode(shaderType: string): Nullable<{ [pointName: string]: string; }> {
		if (shaderType === "vertex") {
			const { defineName } = this.getStaticProps();
			return wrapCustomCodeWithDefine(this.declareVertexCode(), defineName) as any;
		}
		if (shaderType === "fragment") {
			const { defineName } = this.getStaticProps();
			return wrapCustomCodeWithDefine(this.declareFragmentCode(), defineName) as any;
		}
		return null;
	}

	constructor(material: Material, staticProps?: PluginStaticProps) {
		const {
			className = "Error",
			priority = 0,
			defineName = "ERROR",
		} = staticProps ?? {};
		super(material, className, priority, { [defineName]: false });
	}

	// getter / setter
	get staticProps() { return this.getStaticProps(); }

	get enabled() { return this._enabled; }
	set enabled(value) { this.setEnabled(value); }
}
