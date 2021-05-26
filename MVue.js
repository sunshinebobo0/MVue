// 指令编译
const compileUtil = {
  text(node, expression, vm) {
    let value
    if (expression.indexOf('{{') !== -1) {
      value = expression.replace(/\{\{(.+?)\}\}/g, (...args) => {
        new Watcher(vm, args[1], newVal => {
          this.updater.textUpdater(node, this.getVal(args[1], vm))
        })
        return this.getVal(args[1], vm)
      })
    } else {
      value = this.getVal(expression, vm)
    }
    this.updater.textUpdater(node, value)
  },
  html(node, expression, vm) {
    const value = this.getVal(expression, vm)
    new Watcher(vm, expression, newVal => {
      this.updater.htmlUpdater(node, newVal)
    })
    this.updater.htmlUpdater(node, value)
  },
  model(node, expression, vm) {
    const value = this.getVal(expression, vm)
    new Watcher(vm, expression, newVal => {
      this.updater.htmlModel(node, newVal)
    })
    this.updater.htmlModel(node, value)
    // 双向数据绑定 视图更新数据
    node.addEventListener('input', e => {
      this.setVal(expression, vm, e.target.value)
    })
  },
  bind(node, expression, vm, attrName) {
    const value = this.getVal(expression, vm)
    node.setAttribute(attrName, value)
  },
  on(node, expression, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expression]
    node.addEventListener(eventName, fn.bind(vm), false)
  },
  // get val
  getVal(expression, vm) {
    return expression.split('.').reduce((data, currentVal) => {
      return data[currentVal]
    }, vm.$data)
  },
  // set val
  setVal(expression, vm, value) {
    return expression.split('.').reduce((data, currentVal) => {
      data[currentVal] = value
      // return data[currentVal]
    }, vm.$data)
  },
  // updater
  updater: {
    textUpdater(node, value) {
      node.textContent = value
    },
    htmlUpdater(node, value) {
      // console.log(arguments)
      node.innerHTML = value
    },
    htmlModel(node, value) {
      node.value = value
    }
  }
}
class Compile {
  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    // fragment 减少页面重绘 回流
    const fragment = this.node2Fragment(this.el)
    // 编译模板
    this.compile(fragment)
    // 追加子元素到根元素
    this.el.appendChild(fragment)
  }
  compile(fragment) {
    // 获取子节点
    const childNodes = fragment.childNodes
    let a = [...childNodes].forEach(child => {
      if (this.isElementNode(child)) {
        // 元素节点
        if (child.childNodes && child.childNodes.length) {
          this.compile(child)
        }
        this.compileElement(child)
      } else {
        // 文本节点
        this.compileText(child)
      }
    })
  }
  // 是否为指令
  isDirective(attrName) {
    return attrName.startsWith('v-')
  }
  isAttribute(attrName) {
    return attrName.startsWith(':')
  }
  // 是否为事件
  isEventName(attrName) {
    return attrName.startsWith('@')
  }
  // 编译元素
  compileElement(node) {
    const attributes = node.attributes
    let a = [...attributes].forEach(attr => {
      const { name, value } = attr
      if (this.isDirective(name)) {
        // 是一个指令v-text v-html v-model v-on:click...
        const [, directive] = name.split('-') //text html model on:click
        const [dirName, eventName] = directive.split(':') //text html model on
        // 数据驱动试图
        compileUtil[dirName](node, value, this.vm, eventName)
        // 删除标签属性
        node.removeAttribute('v-' + directive)
      } else if (this.isAttribute(name)) {
        // 是一个属性 :attr="xxx"
        const [, attrName] = name.split(':')
        compileUtil['bind'](node, value, this.vm, attrName)
      } else if (this.isEventName(name)) {
        // 是一个事件 @click="xxx"
        const [, eventName] = name.split('@')
        compileUtil['on'](node, value, this.vm, eventName)
      }
    })
  }
  // 编译文本
  compileText(node) {
    // {{}}
    let content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      compileUtil['text'](node, content, this.vm)
    }
  }
  node2Fragment(el) {
    const f = document.createDocumentFragment()
    let firstChild
    while ((firstChild = el.firstChild)) {
      f.appendChild(firstChild)
    }
    return f
  }
  isElementNode(node) {
    return node.nodeType === 1
  }
}
class MVue {
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    if (this.$el) {
      // 实现一个数据观察者
      new Observer(this.$data)
      // 实现一个指令解析器
      new Compile(this.$el, this)
      // 数据代理
      this.proxyData(this.$data)
    }
    window.vm = this
  }
  proxyData(data) {
    let keys = Object.keys(data)
    keys.forEach(key => {
      if (typeof key === 'object') {
        proxyData(data[key])
      }
      Object.defineProperty(this, key, {
        enumberable: true, // 是否可遍历
        configurable: false, // 是否即可更改编写
        get() {
          return data[key]
        },
        set(newVal) {
          data[key] = newVal
        }
      })
    })
  }
}
