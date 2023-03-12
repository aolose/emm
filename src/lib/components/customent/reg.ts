import { get, writable } from "svelte/store";
import { browser } from "$app/environment";
import type { SvelteComponent } from "svelte";
export const elmCpm:{[key:string]:SvelteComponent}= {}
export const elmProps=writable({})
export const elmTmpl=writable<{[key:string]:HTMLElement}>({})
export const  regElement = (tag:string,cpm:SvelteComponent)=>{
  if(!browser||elmCpm[tag]||customElements.get(tag))return;
  elmCpm[tag]=cpm
  const a = class extends HTMLElement {
    constructor() {
      super();
      const p:{[key:string]:string} = {}
      let k = tag+'@'
      for (const {name,value} of this.attributes) {
          k+=name+(p[name]=value)
      }
      elmProps.update(o=>({...o,[k]:p}))
      elmTmpl.subscribe(a=>{
        const c = a[k]
        if(c instanceof HTMLElement){
          this.innerHTML=''
          const d = c.cloneNode(true)
          d.childNodes.forEach(a=>{
            this.appendChild(a)
          })
        }
      })
    }
  }
  customElements.define(tag,a);
}