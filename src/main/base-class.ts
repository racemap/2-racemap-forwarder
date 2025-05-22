import _pick from 'lodash/pick.js';

export class BaseClass {
  _class = 'BaseClass';
  _inheritance: Array<string> = ['BaseClass'];

  constructor() {
    this._bind = this._bind.bind(this);
    this._bind(['buildMethodFreeVersionOfYou']);
  }

  _setClassType(aClass: string): void {
    this._class = aClass;
    this._inheritance.push(aClass);
  }

  _bind(arrayOfMethodNamesToBind: Array<string>): void {
    for (const method of arrayOfMethodNamesToBind) {
      this._doBind(method as keyof BaseClass);
    }
  }

  _doBind(method: keyof BaseClass): void {
    // @ts-ignore
    this[method] ? (this[method] = this[method].bind(this)) : console.error('_bind', method, 'failed');
  }

  _propertyIsNotOfTypeFunction(propertyName: keyof BaseClass): boolean {
    return typeof this[propertyName] !== 'function';
  }

  buildMethodFreeVersionOfYou(): Record<string, unknown> {
    const properties: Array<string> = [];
    for (const property of Object.keys(this)) {
      if (this._propertyIsNotOfTypeFunction(property as keyof BaseClass)) properties.push(property);
    }
    return _pick(this, properties);
  }

  get className(): string {
    return this.constructor.name;
  }
}
