// 观察者
class Watcher {
  constructor(vm, expression, callback) {
    this.vm = vm
    this.expression = expression
    this.callback = callback
    // save old val
    this.oldVal = this.getOldVal()
  }
  getOldVal() {
    Dep.target = this
    const oldVal = compileUtil.getVal(this.expression, this.vm)
    Dep.target = null
    return oldVal
  }
  update() {
    const newVal = compileUtil.getVal(this.expression, this.vm)
    if (newVal !== this.oldVal) {
      this.callback(newVal)
    }
  }
}

// 订阅器
class Dep {
  constructor() {
    this.subs = []
  }
  // 收集观察者
  addSub(watcher) {
    this.subs.push(watcher)
  }
  // 通知观察者去更新
  notify() {
    console.log('观察者', this.subs)
    this.subs.forEach(watcher => watcher.update())
  }
}

class Observer {
  constructor(data) {
    this.observer(data)
  }
  observer(data) {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        this.definedReactive(data, key, data[key])
      })
    }
  }
  definedReactive(obj, key, value) {
    // 递归遍历
    this.observer(value)
    const dep = new Dep()
    dep.key = key
    // 数据劫持
    Object.defineProperty(obj, key, {
      enumberable: true, // 是否可遍历
      configurable: false, // 是否即可更改编写
      get() {
        // 订阅数据变化时 往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: newVal => {
        if (newVal !== value) {
          this.observer(newVal)
          value = newVal
        }
        // 通知变化
        dep.notify()
      }
    })
  }
}
