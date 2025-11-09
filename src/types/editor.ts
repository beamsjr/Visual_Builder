import { ClassicPreset } from 'rete';
import type { DBTNodeData } from './dbt';

export class Connection extends ClassicPreset.Connection<
  ClassicPreset.Node,
  ClassicPreset.Node
> {}

export class Socket extends ClassicPreset.Socket {
  constructor(name: string) {
    super(name);
  }
}

export type Schemes = {
  Connection: Connection;
  Node: DBTNode | SourceNode | ModelNode | TransformNode;
};

export class DBTNode extends ClassicPreset.Node {
  width = 200;
  height = 120;
  data: DBTNodeData;

  constructor(data: DBTNodeData) {
    super(data.name);
    this.data = data;
  }
}

export class SourceNode extends ClassicPreset.Node<
  {},
  { value: ClassicPreset.Socket }
> {
  width = 200;
  height = 140;
  data: DBTNodeData;

  constructor(data: DBTNodeData) {
    super(data.name);
    this.data = data;
    this.addOutput('value', new ClassicPreset.Output(new Socket('data'), 'Data'));
  }
}

export class ModelNode extends ClassicPreset.Node<
  { input: ClassicPreset.Socket },
  { value: ClassicPreset.Socket }
> {
  width = 220;
  height = 200;
  data: DBTNodeData;

  constructor(data: DBTNodeData) {
    super(data.name);
    this.data = data;
    this.addInput('input', new ClassicPreset.Input(new Socket('data'), 'Input', true));
    this.addOutput('value', new ClassicPreset.Output(new Socket('data'), 'Output'));
  }
}

export class TransformNode extends ClassicPreset.Node<
  { input: ClassicPreset.Socket },
  { value: ClassicPreset.Socket }
> {
  width = 240;
  height = 250;
  data: DBTNodeData;

  constructor(data: DBTNodeData) {
    super(data.name);
    this.data = data;
    this.addInput('input', new ClassicPreset.Input(new Socket('data'), 'Input', true));
    this.addOutput('value', new ClassicPreset.Output(new Socket('data'), 'Output'));
  }
}
