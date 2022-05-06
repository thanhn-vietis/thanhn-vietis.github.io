'use strict';(function(){var DRAG_HANDLER_SIZE=15;CKEDITOR.plugins.add('widget',{lang:'af,ar,bg,ca,cs,cy,da,de,de-ch,el,en,en-gb,eo,es,eu,fa,fi,fr,gl,he,hr,hu,id,it,ja,km,ko,ku,lv,nb,nl,no,oc,pl,pt,pt-br,ru,sk,sl,sq,sv,tr,tt,ug,uk,vi,zh,zh-cn',requires:'lineutils,clipboard,widgetselection',onLoad:function(){CKEDITOR.addCss('.cke_widget_wrapper{'+
'position:relative;'+
'outline:none'+
'}'+
'.cke_widget_inline{'+
'display:inline-block'+
'}'+
'.cke_widget_wrapper:hover>.cke_widget_element{'+
'outline:2px solid yellow;'+
'cursor:default'+
'}'+
'.cke_widget_wrapper:hover .cke_widget_editable{'+
'outline:2px solid yellow'+
'}'+
'.cke_widget_wrapper.cke_widget_focused>.cke_widget_element,'+
'.cke_widget_wrapper .cke_widget_editable.cke_widget_editable_focused{'+
'outline:2px solid #ace'+
'}'+
'.cke_widget_editable{'+
'cursor:text'+
'}'+
'.cke_widget_drag_handler_container{'+
'position:absolute;'+
'width:'+DRAG_HANDLER_SIZE+'px;'+
'height:0;'+
'display:none;'+
'opacity:0.75;'+
'transition:height 0s 0.2s;'+
'line-height:0'+
'}'+
'.cke_widget_wrapper:hover>.cke_widget_drag_handler_container{'+
'height:'+DRAG_HANDLER_SIZE+'px;'+
'transition:none'+
'}'+
'.cke_widget_drag_handler_container:hover{'+
'opacity:1'+
'}'+
'img.cke_widget_drag_handler{'+
'cursor:move;'+
'width:'+DRAG_HANDLER_SIZE+'px;'+
'height:'+DRAG_HANDLER_SIZE+'px;'+
'display:inline-block'+
'}'+
'.cke_widget_mask{'+
'position:absolute;'+
'top:0;'+
'left:0;'+
'width:100%;'+
'height:100%;'+
'display:block'+
'}'+
'.cke_editable.cke_widget_dragging, .cke_editable.cke_widget_dragging *{'+
'cursor:move !important'+
'}');},beforeInit:function(editor){editor.widgets=new Repository(editor);},afterInit:function(editor){addWidgetButtons(editor);setupContextMenu(editor);}});function Repository(editor){this.editor=editor;this.registered={};this.instances={};this.selected=[];this.focused=null;this.widgetHoldingFocusedEditable=null;this._={nextId:0,upcasts:[],upcastCallbacks:[],filters:{}};setupWidgetsLifecycle(this);setupSelectionObserver(this);setupMouseObserver(this);setupKeyboardObserver(this);setupDragAndDrop(this);setupNativeCutAndCopy(this);}
Repository.prototype={MIN_SELECTION_CHECK_INTERVAL:500,add:function(name,widgetDef){widgetDef=CKEDITOR.tools.prototypedCopy(widgetDef);widgetDef.name=name;widgetDef._=widgetDef._||{};this.editor.fire('widgetDefinition',widgetDef);if(widgetDef.template)
widgetDef.template=new CKEDITOR.template(widgetDef.template);addWidgetCommand(this.editor,widgetDef);addWidgetProcessors(this,widgetDef);this.registered[name]=widgetDef;return widgetDef;},addUpcastCallback:function(callback){this._.upcastCallbacks.push(callback);},checkSelection:function(){var sel=this.editor.getSelection(),selectedElement=sel.getSelectedElement(),updater=stateUpdater(this),widget;if(selectedElement&&(widget=this.getByElement(selectedElement,true)))
return updater.focus(widget).select(widget).commit();var range=sel.getRanges()[0];if(!range||range.collapsed)
return updater.commit();var walker=new CKEDITOR.dom.walker(range),wrapper;walker.evaluator=Widget.isDomWidgetWrapper;while((wrapper=walker.next()))
updater.select(this.getByElement(wrapper));updater.commit();},checkWidgets:function(options){this.fire('checkWidgets',CKEDITOR.tools.copy(options||{}));},del:function(widget){if(this.focused===widget){var editor=widget.editor,range=editor.createRange(),found;if(!(found=range.moveToClosestEditablePosition(widget.wrapper,true)))
found=range.moveToClosestEditablePosition(widget.wrapper,false);if(found)
editor.getSelection().selectRanges([range]);}
widget.wrapper.remove();this.destroy(widget,true);},destroy:function(widget,offline){if(this.widgetHoldingFocusedEditable===widget)
setFocusedEditable(this,widget,null,offline);widget.destroy(offline);delete this.instances[widget.id];this.fire('instanceDestroyed',widget);},destroyAll:function(offline,container){var widget,id,instances=this.instances;if(container&&!offline){var wrappers=container.find('.cke_widget_wrapper'),l=wrappers.count(),i=0;for(;i<l;++i){widget=this.getByElement(wrappers.getItem(i),true);if(widget)
this.destroy(widget);}
return;}
for(id in instances){widget=instances[id];this.destroy(widget,offline);}},finalizeCreation:function(container){var wrapper=container.getFirst();if(wrapper&&Widget.isDomWidgetWrapper(wrapper)){this.editor.insertElement(wrapper);var widget=this.getByElement(wrapper);widget.ready=true;widget.fire('ready');widget.focus();}},getByElement:(function(){var validWrapperElements={div:1,span:1};function getWidgetId(element){return element.is(validWrapperElements)&&element.data('cke-widget-id');}
return function(element,checkWrapperOnly){if(!element)
return null;var id=getWidgetId(element);if(!checkWrapperOnly&&!id){var limit=this.editor.editable();do{element=element.getParent();}while(element&&!element.equals(limit)&&!(id=getWidgetId(element)));}
return this.instances[id]||null;};})(),initOn:function(element,widgetDef,startupData){if(!widgetDef)
widgetDef=this.registered[element.data('widget')];else if(typeof widgetDef=='string')
widgetDef=this.registered[widgetDef];if(!widgetDef)
return null;var wrapper=this.wrapElement(element,widgetDef.name);if(wrapper){if(wrapper.hasClass('cke_widget_new')){var widget=new Widget(this,this._.nextId++,element,widgetDef,startupData);if(widget.isInited()){this.instances[widget.id]=widget;return widget;}else{return null;}}
return this.getByElement(element);}
return null;},initOnAll:function(container){var newWidgets=(container||this.editor.editable()).find('.cke_widget_new'),newInstances=[],instance;for(var i=newWidgets.count();i--;){instance=this.initOn(newWidgets.getItem(i).getFirst(Widget.isDomWidgetElement));if(instance)
newInstances.push(instance);}
return newInstances;},onWidget:function(widgetName){var args=Array.prototype.slice.call(arguments);args.shift();for(var i in this.instances){var instance=this.instances[i];if(instance.name==widgetName){instance.on.apply(instance,args);}}
this.on('instanceCreated',function(evt){var widget=evt.data;if(widget.name==widgetName){widget.on.apply(widget,args);}});},parseElementClasses:function(classes){if(!classes)
return null;classes=CKEDITOR.tools.trim(classes).split(/\s+/);var cl,obj={},hasClasses=0;while((cl=classes.pop())){if(cl.indexOf('cke_')==-1)
obj[cl]=hasClasses=1;}
return hasClasses?obj:null;},wrapElement:function(element,widgetName){var wrapper=null,widgetDef,isInline;if(element instanceof CKEDITOR.dom.element){widgetName=widgetName||element.data('widget');widgetDef=this.registered[widgetName];if(!widgetDef)
return null;wrapper=element.getParent();if(wrapper&&wrapper.type==CKEDITOR.NODE_ELEMENT&&wrapper.data('cke-widget-wrapper'))
return wrapper;if(!element.hasAttribute('data-cke-widget-keep-attr'))
element.data('cke-widget-keep-attr',element.data('widget')?1:0);element.data('widget',widgetName);isInline=isWidgetInline(widgetDef,element.getName());wrapper=new CKEDITOR.dom.element(isInline?'span':'div');wrapper.setAttributes(getWrapperAttributes(isInline,widgetName));wrapper.data('cke-display-name',widgetDef.pathName?widgetDef.pathName:element.getName());if(element.getParent(true))
wrapper.replace(element);element.appendTo(wrapper);}
else if(element instanceof CKEDITOR.htmlParser.element){widgetName=widgetName||element.attributes['data-widget'];widgetDef=this.registered[widgetName];if(!widgetDef)
return null;wrapper=element.parent;if(wrapper&&wrapper.type==CKEDITOR.NODE_ELEMENT&&wrapper.attributes['data-cke-widget-wrapper'])
return wrapper;if(!('data-cke-widget-keep-attr'in element.attributes))
element.attributes['data-cke-widget-keep-attr']=element.attributes['data-widget']?1:0;if(widgetName)
element.attributes['data-widget']=widgetName;isInline=isWidgetInline(widgetDef,element.name);wrapper=new CKEDITOR.htmlParser.element(isInline?'span':'div',getWrapperAttributes(isInline,widgetName));wrapper.attributes['data-cke-display-name']=widgetDef.pathName?widgetDef.pathName:element.name;var parent=element.parent,index;if(parent){index=element.getIndex();element.remove();}
wrapper.add(element);parent&&insertElement(parent,index,wrapper);}
return wrapper;},_tests_createEditableFilter:createEditableFilter};CKEDITOR.event.implementOn(Repository.prototype);function Widget(widgetsRepo,id,element,widgetDef,startupData){var editor=widgetsRepo.editor;CKEDITOR.tools.extend(this,widgetDef,{editor:editor,id:id,inline:element.getParent().getName()=='span',element:element,data:CKEDITOR.tools.extend({},typeof widgetDef.defaults=='function'?widgetDef.defaults():widgetDef.defaults),dataReady:false,inited:false,ready:false,edit:Widget.prototype.edit,focusedEditable:null,definition:widgetDef,repository:widgetsRepo,draggable:widgetDef.draggable!==false,_:{downcastFn:(widgetDef.downcast&&typeof widgetDef.downcast=='string')?widgetDef.downcasts[widgetDef.downcast]:widgetDef.downcast}},true);widgetsRepo.fire('instanceCreated',this);setupWidget(this,widgetDef);this.init&&this.init();this.inited=true;setupWidgetData(this,startupData);if(this.isInited()&&editor.editable().contains(this.wrapper)){this.ready=true;this.fire('ready');}}
Widget.prototype={addClass:function(className){this.element.addClass(className);this.wrapper.addClass(Widget.WRAPPER_CLASS_PREFIX+className);},applyStyle:function(style){applyRemoveStyle(this,style,1);},checkStyleActive:function(style){var classes=getStyleClasses(style),cl;if(!classes)
return false;while((cl=classes.pop())){if(!this.hasClass(cl))
return false;}
return true;},destroy:function(offline){this.fire('destroy');if(this.editables){for(var name in this.editables)
this.destroyEditable(name,offline);}
if(!offline){if(this.element.data('cke-widget-keep-attr')=='0')
this.element.removeAttribute('data-widget');this.element.removeAttributes(['data-cke-widget-data','data-cke-widget-keep-attr']);this.element.removeClass('cke_widget_element');this.element.replace(this.wrapper);}
this.wrapper=null;},destroyEditable:function(editableName,offline){var editable=this.editables[editableName];editable.removeListener('focus',onEditableFocus);editable.removeListener('blur',onEditableBlur);this.editor.focusManager.remove(editable);if(!offline){this.repository.destroyAll(false,editable);editable.removeClass('cke_widget_editable');editable.removeClass('cke_widget_editable_focused');editable.removeAttributes(['contenteditable','data-cke-widget-editable','data-cke-enter-mode']);}
delete this.editables[editableName];},edit:function(){var evtData={dialog:this.dialog},that=this;if(this.fire('edit',evtData)===false||!evtData.dialog)
return false;this.editor.openDialog(evtData.dialog,function(dialog){var showListener,okListener;if(that.fire('dialog',dialog)===false)
return;showListener=dialog.on('show',function(){dialog.setupContent(that);});okListener=dialog.on('ok',function(){var dataChanged,dataListener=that.on('data',function(evt){dataChanged=1;evt.cancel();},null,null,0);that.editor.fire('saveSnapshot');dialog.commitContent(that);dataListener.removeListener();if(dataChanged){that.fire('data',that.data);that.editor.fire('saveSnapshot');}});dialog.once('hide',function(){showListener.removeListener();okListener.removeListener();});});return true;},getClasses:function(){return this.repository.parseElementClasses(this.element.getAttribute('class'));},hasClass:function(className){return this.element.hasClass(className);},initEditable:function(editableName,definition){var editable=this._findOneNotNested(definition.selector);if(editable&&editable.is(CKEDITOR.dtd.$editable)){editable=new NestedEditable(this.editor,editable,{filter:createEditableFilter.call(this.repository,this.name,editableName,definition)});this.editables[editableName]=editable;editable.setAttributes({contenteditable:'true','data-cke-widget-editable':editableName,'data-cke-enter-mode':editable.enterMode});if(editable.filter)
editable.data('cke-filter',editable.filter.id);editable.addClass('cke_widget_editable');editable.removeClass('cke_widget_editable_focused');if(definition.pathName)
editable.data('cke-display-name',definition.pathName);this.editor.focusManager.add(editable);editable.on('focus',onEditableFocus,this);CKEDITOR.env.ie&&editable.on('blur',onEditableBlur,this);editable._.initialSetData=true;editable.setData(editable.getHtml());return true;}
return false;},_findOneNotNested:function(selector){var matchedElements=this.wrapper.find(selector),match,closestWrapper;for(var i=0;i<matchedElements.count();i++){match=matchedElements.getItem(i);closestWrapper=match.getAscendant(Widget.isDomWidgetWrapper);if(this.wrapper.equals(closestWrapper)){return match;}}
return null;},isInited:function(){return!!(this.wrapper&&this.inited);},isReady:function(){return this.isInited()&&this.ready;},focus:function(){var sel=this.editor.getSelection();if(sel){var isDirty=this.editor.checkDirty();sel.fake(this.wrapper);!isDirty&&this.editor.resetDirty();}
this.editor.focus();},removeClass:function(className){this.element.removeClass(className);this.wrapper.removeClass(Widget.WRAPPER_CLASS_PREFIX+className);},removeStyle:function(style){applyRemoveStyle(this,style,0);},setData:function(key,value){var data=this.data,modified=0;if(typeof key=='string'){if(data[key]!==value){data[key]=value;modified=1;}}
else{var newData=key;for(key in newData){if(data[key]!==newData[key]){modified=1;data[key]=newData[key];}}}
if(modified&&this.dataReady){writeDataToElement(this);this.fire('data',data);}
return this;},setFocused:function(focused){this.wrapper[focused?'addClass':'removeClass']('cke_widget_focused');this.fire(focused?'focus':'blur');return this;},setSelected:function(selected){this.wrapper[selected?'addClass':'removeClass']('cke_widget_selected');this.fire(selected?'select':'deselect');return this;},updateDragHandlerPosition:function(){var editor=this.editor,domElement=this.element.$,oldPos=this._.dragHandlerOffset,newPos={x:domElement.offsetLeft,y:domElement.offsetTop-DRAG_HANDLER_SIZE};if(oldPos&&newPos.x==oldPos.x&&newPos.y==oldPos.y)
return;var initialDirty=editor.checkDirty();editor.fire('lockSnapshot');this.dragHandlerContainer.setStyles({top:newPos.y+'px',left:newPos.x+'px',display:'block'});editor.fire('unlockSnapshot');!initialDirty&&editor.resetDirty();this._.dragHandlerOffset=newPos;}};CKEDITOR.event.implementOn(Widget.prototype);Widget.getNestedEditable=function(guard,node){if(!node||node.equals(guard))
return null;if(Widget.isDomNestedEditable(node))
return node;return Widget.getNestedEditable(guard,node.getParent());};Widget.isDomDragHandler=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&node.hasAttribute('data-cke-widget-drag-handler');};Widget.isDomDragHandlerContainer=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&node.hasClass('cke_widget_drag_handler_container');};Widget.isDomNestedEditable=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&node.hasAttribute('data-cke-widget-editable');};Widget.isDomWidgetElement=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&node.hasAttribute('data-widget');};Widget.isDomWidgetWrapper=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&node.hasAttribute('data-cke-widget-wrapper');};Widget.isParserWidgetElement=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&!!node.attributes['data-widget'];};Widget.isParserWidgetWrapper=function(node){return node.type==CKEDITOR.NODE_ELEMENT&&!!node.attributes['data-cke-widget-wrapper'];};Widget.WRAPPER_CLASS_PREFIX='cke_widget_wrapper_';function NestedEditable(editor,element,config){CKEDITOR.dom.element.call(this,element.$);this.editor=editor;this._={};var filter=this.filter=config.filter;if(!CKEDITOR.dtd[this.getName()].p)
this.enterMode=this.shiftEnterMode=CKEDITOR.ENTER_BR;else{this.enterMode=filter?filter.getAllowedEnterMode(editor.enterMode):editor.enterMode;this.shiftEnterMode=filter?filter.getAllowedEnterMode(editor.shiftEnterMode,true):editor.shiftEnterMode;}}
NestedEditable.prototype=CKEDITOR.tools.extend(CKEDITOR.tools.prototypedCopy(CKEDITOR.dom.element.prototype),{setData:function(data){if(!this._.initialSetData){this.editor.widgets.destroyAll(false,this);}
this._.initialSetData=false;data=this.editor.dataProcessor.toHtml(data,{context:this.getName(),filter:this.filter,enterMode:this.enterMode});this.setHtml(data);this.editor.widgets.initOnAll(this);},getData:function(){return this.editor.dataProcessor.toDataFormat(this.getHtml(),{context:this.getName(),filter:this.filter,enterMode:this.enterMode});}});function addWidgetButtons(editor){var widgets=editor.widgets.registered,widget,widgetName,widgetButton;for(widgetName in widgets){widget=widgets[widgetName];widgetButton=widget.button;if(widgetButton&&editor.ui.addButton){editor.ui.addButton(CKEDITOR.tools.capitalize(widget.name,true),{label:widgetButton,command:widget.name,toolbar:'insert,10'});}}}
function addWidgetCommand(editor,widgetDef){editor.addCommand(widgetDef.name,{exec:function(editor,commandData){var focused=editor.widgets.focused;if(focused&&focused.name==widgetDef.name)
focused.edit();else if(widgetDef.insert)
widgetDef.insert();else if(widgetDef.template){var defaults=typeof widgetDef.defaults=='function'?widgetDef.defaults():widgetDef.defaults,element=CKEDITOR.dom.element.createFromHtml(widgetDef.template.output(defaults)),instance,wrapper=editor.widgets.wrapElement(element,widgetDef.name),temp=new CKEDITOR.dom.documentFragment(wrapper.getDocument());temp.append(wrapper);instance=editor.widgets.initOn(element,widgetDef,commandData&&commandData.startupData);if(!instance){finalizeCreation();return;}
var editListener=instance.once('edit',function(evt){if(evt.data.dialog){instance.once('dialog',function(evt){var dialog=evt.data,okListener,cancelListener;okListener=dialog.once('ok',finalizeCreation,null,null,20);cancelListener=dialog.once('cancel',function(evt){if(!(evt.data&&evt.data.hide===false)){editor.widgets.destroy(instance,true);}});dialog.once('hide',function(){okListener.removeListener();cancelListener.removeListener();});});}else{finalizeCreation();}},null,null,999);instance.edit();editListener.removeListener();}
function finalizeCreation(){editor.widgets.finalizeCreation(temp);}},allowedContent:widgetDef.allowedContent,requiredContent:widgetDef.requiredContent,contentForms:widgetDef.contentForms,contentTransformations:widgetDef.contentTransformations});}
function addWidgetProcessors(widgetsRepo,widgetDef){var upcast=widgetDef.upcast,upcasts,priority=widgetDef.upcastPriority||10;if(!upcast)
return;if(typeof upcast=='string'){upcasts=upcast.split(',');while(upcasts.length){addUpcast(widgetDef.upcasts[upcasts.pop()],widgetDef.name,priority);}}
else{addUpcast(upcast,widgetDef.name,priority);}
function addUpcast(upcast,name,priority){var index=CKEDITOR.tools.getIndex(widgetsRepo._.upcasts,function(element){return element[2]>priority;});if(index<0){index=widgetsRepo._.upcasts.length;}
widgetsRepo._.upcasts.splice(index,0,[upcast,name,priority]);}}
function blurWidget(widgetsRepo,widget){widgetsRepo.focused=null;if(widget.isInited()){var isDirty=widget.editor.checkDirty();widgetsRepo.fire('widgetBlurred',{widget:widget});widget.setFocused(false);!isDirty&&widget.editor.resetDirty();}}
function checkWidgets(evt){var options=evt.data;if(this.editor.mode!='wysiwyg')
return;var editable=this.editor.editable(),instances=this.instances,newInstances,i,count,wrapper,notYetInitialized;if(!editable)
return;for(i in instances){if(instances[i].isReady()&&!editable.contains(instances[i].wrapper))
this.destroy(instances[i],true);}
if(options&&options.initOnlyNew)
newInstances=this.initOnAll();else{var wrappers=editable.find('.cke_widget_wrapper');newInstances=[];for(i=0,count=wrappers.count();i<count;i++){wrapper=wrappers.getItem(i);notYetInitialized=!this.getByElement(wrapper,true);if(notYetInitialized&&!findParent(wrapper,isDomTemp)&&editable.contains(wrapper)){wrapper.addClass('cke_widget_new');newInstances.push(this.initOn(wrapper.getFirst(Widget.isDomWidgetElement)));}}}
if(options&&options.focusInited&&newInstances.length==1)
newInstances[0].focus();}
function cleanUpWidgetElement(el){var parent=el.parent;if(parent.type==CKEDITOR.NODE_ELEMENT&&parent.attributes['data-cke-widget-wrapper'])
parent.replaceWith(el);}
function cleanUpAllWidgetElements(widgetsRepo,container){var wrappers=container.find('.cke_widget_wrapper'),wrapper,element,i=0,l=wrappers.count();for(;i<l;++i){wrapper=wrappers.getItem(i);element=wrapper.getFirst(Widget.isDomWidgetElement);if(element.type==CKEDITOR.NODE_ELEMENT&&element.data('widget')){element.replace(wrapper);widgetsRepo.wrapElement(element);}else{wrapper.remove();}}}
function createEditableFilter(widgetName,editableName,editableDefinition){if(!editableDefinition.allowedContent)
return null;var editables=this._.filters[widgetName];if(!editables)
this._.filters[widgetName]=editables={};var filter=editables[editableName];if(!filter)
editables[editableName]=filter=new CKEDITOR.filter(editableDefinition.allowedContent);return filter;}
function createUpcastIterator(widgetsRepo){var toBeWrapped=[],upcasts=widgetsRepo._.upcasts,upcastCallbacks=widgetsRepo._.upcastCallbacks;return{toBeWrapped:toBeWrapped,iterator:function(element){var upcast,upcasted,data,i,upcastsLength,upcastCallbacksLength;if('data-cke-widget-wrapper'in element.attributes){element=element.getFirst(Widget.isParserWidgetElement);if(element)
toBeWrapped.push([element]);return false;}
else if('data-widget'in element.attributes){toBeWrapped.push([element]);return false;}
else if((upcastsLength=upcasts.length)){if(element.attributes['data-cke-widget-upcasted'])
return false;for(i=0,upcastCallbacksLength=upcastCallbacks.length;i<upcastCallbacksLength;++i){if(upcastCallbacks[i](element)===false)
return;}
for(i=0;i<upcastsLength;++i){upcast=upcasts[i];data={};if((upcasted=upcast[0](element,data))){if(upcasted instanceof CKEDITOR.htmlParser.element)
element=upcasted;element.attributes['data-cke-widget-data']=encodeURIComponent(JSON.stringify(data));element.attributes['data-cke-widget-upcasted']=1;toBeWrapped.push([element,upcast[1]]);return false;}}}}};}
function findParent(element,query){var parent=element;while((parent=parent.getParent())){if(query(parent))
return true;}
return false;}
function getWrapperAttributes(inlineWidget,name){return{tabindex:-1,contenteditable:'false','data-cke-widget-wrapper':1,'data-cke-filter':'off','class':'cke_widget_wrapper cke_widget_new cke_widget_'+
(inlineWidget?'inline':'block')+
(name?' cke_widget_'+name:'')};}
function insertElement(parent,index,element){if(parent.type==CKEDITOR.NODE_ELEMENT){var parentAllows=CKEDITOR.dtd[parent.name];if(parentAllows&&!parentAllows[element.name]){var parent2=parent.split(index),parentParent=parent.parent;index=parent2.getIndex();if(!parent.children.length){index-=1;parent.remove();}
if(!parent2.children.length)
parent2.remove();return insertElement(parentParent,index,element);}}
parent.add(element,index);}
function isWidgetInline(widgetDef,elementName){return typeof widgetDef.inline=='boolean'?widgetDef.inline:!!CKEDITOR.dtd.$inline[elementName];}
function isDomTemp(element){return element.hasAttribute('data-cke-temp');}
function onEditableKey(widget,keyCode){var focusedEditable=widget.focusedEditable,range;if(keyCode==CKEDITOR.CTRL+65){var bogus=focusedEditable.getBogus();range=widget.editor.createRange();range.selectNodeContents(focusedEditable);if(bogus)
range.setEndAt(bogus,CKEDITOR.POSITION_BEFORE_START);range.select();return false;}
else if(keyCode==8||keyCode==46){var ranges=widget.editor.getSelection().getRanges();range=ranges[0];return!(ranges.length==1&&range.collapsed&&range.checkBoundaryOfElement(focusedEditable,CKEDITOR[keyCode==8?'START':'END']));}}
function setFocusedEditable(widgetsRepo,widget,editableElement,offline){var editor=widgetsRepo.editor;editor.fire('lockSnapshot');if(editableElement){var editableName=editableElement.data('cke-widget-editable'),editableInstance=widget.editables[editableName];widgetsRepo.widgetHoldingFocusedEditable=widget;widget.focusedEditable=editableInstance;editableElement.addClass('cke_widget_editable_focused');if(editableInstance.filter)
editor.setActiveFilter(editableInstance.filter);editor.setActiveEnterMode(editableInstance.enterMode,editableInstance.shiftEnterMode);}else{if(!offline)
widget.focusedEditable.removeClass('cke_widget_editable_focused');widget.focusedEditable=null;widgetsRepo.widgetHoldingFocusedEditable=null;editor.setActiveFilter(null);editor.setActiveEnterMode(null,null);}
editor.fire('unlockSnapshot');}
function setupContextMenu(editor){if(!editor.contextMenu)
return;editor.contextMenu.addListener(function(element){var widget=editor.widgets.getByElement(element,true);if(widget)
return widget.fire('contextMenu',{});});}
var pasteReplaceRegex=new RegExp('^'+
'(?:<(?:div|span)(?: data-cke-temp="1")?(?: id="cke_copybin")?(?: data-cke-temp="1")?>)?'+
'(?:<(?:div|span)(?: style="[^"]+")?>)?'+
'<span [^>]*data-cke-copybin-start="1"[^>]*>.?</span>([\\s\\S]+)<span [^>]*data-cke-copybin-end="1"[^>]*>.?</span>'+
'(?:</(?:div|span)>)?'+
'(?:</(?:div|span)>)?'+
'$','i');function pasteReplaceFn(match,wrapperHtml){return CKEDITOR.tools.trim(wrapperHtml);}
function setupDragAndDrop(widgetsRepo){var editor=widgetsRepo.editor,lineutils=CKEDITOR.plugins.lineutils;editor.on('dragstart',function(evt){var target=evt.data.target;if(Widget.isDomDragHandler(target)){var widget=widgetsRepo.getByElement(target);evt.data.dataTransfer.setData('cke/widget-id',widget.id);editor.focus();widget.focus();}});editor.on('drop',function(evt){var dataTransfer=evt.data.dataTransfer,id=dataTransfer.getData('cke/widget-id'),transferType=dataTransfer.getTransferType(editor),dragRange=editor.createRange(),sourceWidget;if(id!==''&&transferType===CKEDITOR.DATA_TRANSFER_CROSS_EDITORS){evt.cancel();return;}
if(id===''||transferType!=CKEDITOR.DATA_TRANSFER_INTERNAL){return;}
sourceWidget=widgetsRepo.instances[id];if(!sourceWidget){return;}
dragRange.setStartBefore(sourceWidget.wrapper);dragRange.setEndAfter(sourceWidget.wrapper);evt.data.dragRange=dragRange;delete CKEDITOR.plugins.clipboard.dragStartContainerChildCount;delete CKEDITOR.plugins.clipboard.dragEndContainerChildCount;evt.data.dataTransfer.setData('text/html',editor.editable().getHtmlFromRange(dragRange).getHtml());editor.widgets.destroy(sourceWidget,true);});editor.on('contentDom',function(){var editable=editor.editable();CKEDITOR.tools.extend(widgetsRepo,{finder:new lineutils.finder(editor,{lookups:{'default':function(el){if(el.is(CKEDITOR.dtd.$listItem))
return;if(!el.is(CKEDITOR.dtd.$block))
return;if(Widget.isDomNestedEditable(el))
return;if(widgetsRepo._.draggedWidget.wrapper.contains(el)){return;}
var nestedEditable=Widget.getNestedEditable(editable,el);if(nestedEditable){var draggedWidget=widgetsRepo._.draggedWidget;if(widgetsRepo.getByElement(nestedEditable)==draggedWidget)
return;var filter=CKEDITOR.filter.instances[nestedEditable.data('cke-filter')],draggedRequiredContent=draggedWidget.requiredContent;if(filter&&draggedRequiredContent&&!filter.check(draggedRequiredContent))
return;}
return CKEDITOR.LINEUTILS_BEFORE|CKEDITOR.LINEUTILS_AFTER;}}}),locator:new lineutils.locator(editor),liner:new lineutils.liner(editor,{lineStyle:{cursor:'move !important','border-top-color':'#666'},tipLeftStyle:{'border-left-color':'#666'},tipRightStyle:{'border-right-color':'#666'}})},true);});}
function setupMouseObserver(widgetsRepo){var editor=widgetsRepo.editor;editor.on('contentDom',function(){var editable=editor.editable(),evtRoot=editable.isInline()?editable:editor.document,widget,mouseDownOnDragHandler;editable.attachListener(evtRoot,'mousedown',function(evt){var target=evt.data.getTarget();if(!target.type)
return false;widget=widgetsRepo.getByElement(target);mouseDownOnDragHandler=0;if(widget){if(widget.inline&&target.type==CKEDITOR.NODE_ELEMENT&&target.hasAttribute('data-cke-widget-drag-handler')){mouseDownOnDragHandler=1;if(widgetsRepo.focused!=widget)
editor.getSelection().removeAllRanges();return;}
if(!Widget.getNestedEditable(widget.wrapper,target)){evt.data.preventDefault();if(!CKEDITOR.env.ie)
widget.focus();}else{widget=null;}}});editable.attachListener(evtRoot,'mouseup',function(){if(mouseDownOnDragHandler&&widget&&widget.wrapper){mouseDownOnDragHandler=0;widget.focus();}});if(CKEDITOR.env.ie){editable.attachListener(evtRoot,'mouseup',function(){setTimeout(function(){if(widget&&widget.wrapper&&editable.contains(widget.wrapper)){widget.focus();widget=null;}});});}});editor.on('doubleclick',function(evt){var widget=widgetsRepo.getByElement(evt.data.element);if(!widget||Widget.getNestedEditable(widget.wrapper,evt.data.element))
return;return widget.fire('doubleclick',{element:evt.data.element});},null,null,1);}
function setupKeyboardObserver(widgetsRepo){var editor=widgetsRepo.editor;editor.on('key',function(evt){var focused=widgetsRepo.focused,widgetHoldingFocusedEditable=widgetsRepo.widgetHoldingFocusedEditable,ret;if(focused)
ret=focused.fire('key',{keyCode:evt.data.keyCode});else if(widgetHoldingFocusedEditable)
ret=onEditableKey(widgetHoldingFocusedEditable,evt.data.keyCode);return ret;},null,null,1);}
function setupNativeCutAndCopy(widgetsRepo){var editor=widgetsRepo.editor;editor.on('contentDom',function(){var editable=editor.editable();editable.attachListener(editable,'copy',eventListener);editable.attachListener(editable,'cut',eventListener);});function eventListener(evt){if(widgetsRepo.focused)
copySingleWidget(widgetsRepo.focused,evt.name=='cut');}}
function setupSelectionObserver(widgetsRepo){var editor=widgetsRepo.editor;editor.on('selectionCheck',function(){widgetsRepo.fire('checkSelection');});widgetsRepo.on('checkSelection',widgetsRepo.checkSelection,widgetsRepo);editor.on('selectionChange',function(evt){var nestedEditable=Widget.getNestedEditable(editor.editable(),evt.data.selection.getStartElement()),newWidget=nestedEditable&&widgetsRepo.getByElement(nestedEditable),oldWidget=widgetsRepo.widgetHoldingFocusedEditable;if(oldWidget){if(oldWidget!==newWidget||!oldWidget.focusedEditable.equals(nestedEditable)){setFocusedEditable(widgetsRepo,oldWidget,null);if(newWidget&&nestedEditable)
setFocusedEditable(widgetsRepo,newWidget,nestedEditable);}}
else if(newWidget&&nestedEditable){setFocusedEditable(widgetsRepo,newWidget,nestedEditable);}});editor.on('dataReady',function(){stateUpdater(widgetsRepo).commit();});editor.on('blur',function(){var widget;if((widget=widgetsRepo.focused))
blurWidget(widgetsRepo,widget);if((widget=widgetsRepo.widgetHoldingFocusedEditable))
setFocusedEditable(widgetsRepo,widget,null);});}
function setupWidgetsLifecycle(widgetsRepo){setupWidgetsLifecycleStart(widgetsRepo);setupWidgetsLifecycleEnd(widgetsRepo);widgetsRepo.on('checkWidgets',checkWidgets);widgetsRepo.editor.on('contentDomInvalidated',widgetsRepo.checkWidgets,widgetsRepo);}
function setupWidgetsLifecycleEnd(widgetsRepo){var editor=widgetsRepo.editor,downcastingSessions={};editor.on('toDataFormat',function(evt){var id=CKEDITOR.tools.getNextNumber(),toBeDowncasted=[];evt.data.downcastingSessionId=id;downcastingSessions[id]=toBeDowncasted;evt.data.dataValue.forEach(function(element){var attrs=element.attributes,widget,widgetElement;if('data-cke-widget-id'in attrs){widget=widgetsRepo.instances[attrs['data-cke-widget-id']];if(widget){widgetElement=element.getFirst(Widget.isParserWidgetElement);toBeDowncasted.push({wrapper:element,element:widgetElement,widget:widget,editables:{}});if(widgetElement.attributes['data-cke-widget-keep-attr']!='1')
delete widgetElement.attributes['data-widget'];}}
else if('data-cke-widget-editable'in attrs){toBeDowncasted[toBeDowncasted.length-1].editables[attrs['data-cke-widget-editable']]=element;return false;}},CKEDITOR.NODE_ELEMENT,true);},null,null,8);editor.on('toDataFormat',function(evt){if(!evt.data.downcastingSessionId)
return;var toBeDowncasted=downcastingSessions[evt.data.downcastingSessionId],toBe,widget,widgetElement,retElement,editableElement,e;while((toBe=toBeDowncasted.shift())){widget=toBe.widget;widgetElement=toBe.element;retElement=widget._.downcastFn&&widget._.downcastFn.call(widget,widgetElement);for(e in toBe.editables){editableElement=toBe.editables[e];delete editableElement.attributes.contenteditable;editableElement.setHtml(widget.editables[e].getData());}
if(!retElement)
retElement=widgetElement;toBe.wrapper.replaceWith(retElement);}},null,null,13);editor.on('contentDomUnload',function(){widgetsRepo.destroyAll(true);});}
function setupWidgetsLifecycleStart(widgetsRepo){var editor=widgetsRepo.editor,processedWidgetOnly,snapshotLoaded;editor.on('toHtml',function(evt){var upcastIterator=createUpcastIterator(widgetsRepo),toBeWrapped;evt.data.dataValue.forEach(upcastIterator.iterator,CKEDITOR.NODE_ELEMENT,true);while((toBeWrapped=upcastIterator.toBeWrapped.pop())){cleanUpWidgetElement(toBeWrapped[0]);widgetsRepo.wrapElement(toBeWrapped[0],toBeWrapped[1]);}
if(evt.data.protectedWhitespaces){processedWidgetOnly=evt.data.dataValue.children.length==3&&Widget.isParserWidgetWrapper(evt.data.dataValue.children[1]);}else{processedWidgetOnly=evt.data.dataValue.children.length==1&&Widget.isParserWidgetWrapper(evt.data.dataValue.children[0]);}},null,null,8);editor.on('dataReady',function(){if(snapshotLoaded)
cleanUpAllWidgetElements(widgetsRepo,editor.editable());snapshotLoaded=0;widgetsRepo.destroyAll(true);widgetsRepo.initOnAll();});editor.on('loadSnapshot',function(evt){if((/data-cke-widget/).test(evt.data))
snapshotLoaded=1;widgetsRepo.destroyAll(true);},null,null,9);editor.on('paste',function(evt){var data=evt.data;data.dataValue=data.dataValue.replace(pasteReplaceRegex,pasteReplaceFn);if(data.range){var nestedEditable=Widget.getNestedEditable(editor.editable(),data.range.startContainer);if(nestedEditable){var filter=CKEDITOR.filter.instances[nestedEditable.data('cke-filter')];if(filter){editor.setActiveFilter(filter);}}}});editor.on('afterInsertHtml',function(evt){if(evt.data.intoRange){widgetsRepo.checkWidgets({initOnlyNew:true});}else{editor.fire('lockSnapshot');widgetsRepo.checkWidgets({initOnlyNew:true,focusInited:processedWidgetOnly});editor.fire('unlockSnapshot');}});}
function stateUpdater(widgetsRepo){var currentlySelected=widgetsRepo.selected,toBeSelected=[],toBeDeselected=currentlySelected.slice(0),focused=null;return{select:function(widget){if(CKEDITOR.tools.indexOf(currentlySelected,widget)<0)
toBeSelected.push(widget);var index=CKEDITOR.tools.indexOf(toBeDeselected,widget);if(index>=0)
toBeDeselected.splice(index,1);return this;},focus:function(widget){focused=widget;return this;},commit:function(){var focusedChanged=widgetsRepo.focused!==focused,widget,isDirty;widgetsRepo.editor.fire('lockSnapshot');if(focusedChanged&&(widget=widgetsRepo.focused))
blurWidget(widgetsRepo,widget);while((widget=toBeDeselected.pop())){currentlySelected.splice(CKEDITOR.tools.indexOf(currentlySelected,widget),1);if(widget.isInited()){isDirty=widget.editor.checkDirty();widget.setSelected(false);!isDirty&&widget.editor.resetDirty();}}
if(focusedChanged&&focused){isDirty=widgetsRepo.editor.checkDirty();widgetsRepo.focused=focused;widgetsRepo.fire('widgetFocused',{widget:focused});focused.setFocused(true);!isDirty&&widgetsRepo.editor.resetDirty();}
while((widget=toBeSelected.pop())){currentlySelected.push(widget);widget.setSelected(true);}
widgetsRepo.editor.fire('unlockSnapshot');}};}
var keystrokesNotBlockedByWidget={37:1,38:1,39:1,40:1,8:1,46:1};function applyRemoveStyle(widget,style,apply){var changed=0,classes=getStyleClasses(style),updatedClasses=widget.data.classes||{},cl;if(!classes)
return;updatedClasses=CKEDITOR.tools.clone(updatedClasses);while((cl=classes.pop())){if(apply){if(!updatedClasses[cl])
changed=updatedClasses[cl]=1;}else{if(updatedClasses[cl]){delete updatedClasses[cl];changed=1;}}}
if(changed)
widget.setData('classes',updatedClasses);}
function cancel(evt){evt.cancel();}
function copySingleWidget(widget,isCut){var editor=widget.editor,doc=editor.document;if(doc.getById('cke_copybin'))
return;var copybinName=(editor.blockless||CKEDITOR.env.ie)?'span':'div',copybin=doc.createElement(copybinName),copybinContainer=doc.createElement(copybinName),needsScrollHack=CKEDITOR.env.ie&&CKEDITOR.env.version<9;copybinContainer.setAttributes({id:'cke_copybin','data-cke-temp':'1'});copybin.setStyles({position:'absolute',width:'1px',height:'1px',overflow:'hidden'});copybin.setStyle(editor.config.contentsLangDirection=='ltr'?'left':'right','-5000px');var range=editor.createRange();range.setStartBefore(widget.wrapper);range.setEndAfter(widget.wrapper);copybin.setHtml('<span data-cke-copybin-start="1">\u200b</span>'+
editor.editable().getHtmlFromRange(range).getHtml()+
'<span data-cke-copybin-end="1">\u200b</span>');editor.fire('saveSnapshot');editor.fire('lockSnapshot');copybinContainer.append(copybin);editor.editable().append(copybinContainer);var listener1=editor.on('selectionChange',cancel,null,null,0),listener2=widget.repository.on('checkSelection',cancel,null,null,0);if(needsScrollHack){var docElement=doc.getDocumentElement().$,scrollTop=docElement.scrollTop;}
range=editor.createRange();range.selectNodeContents(copybin);range.select();if(needsScrollHack)
docElement.scrollTop=scrollTop;setTimeout(function(){if(!isCut)
widget.focus();copybinContainer.remove();listener1.removeListener();listener2.removeListener();editor.fire('unlockSnapshot');if(isCut){widget.repository.del(widget);editor.fire('saveSnapshot');}},100);}
function getStyleClasses(style){var attrs=style.getDefinition().attributes,classes=attrs&&attrs['class'];return classes?classes.split(/\s+/):null;}
function onEditableBlur(){var active=CKEDITOR.document.getActive(),editor=this.editor,editable=editor.editable();if((editable.isInline()?editable:editor.document.getWindow().getFrame()).equals(active))
editor.focusManager.focus(editable);}
function onEditableFocus(){if(CKEDITOR.env.gecko)
this.editor.unlockSelection();if(!CKEDITOR.env.webkit){this.editor.forceNextSelectionCheck();this.editor.selectionChange(1);}}
function setupDataClassesListener(widget){var previousClasses=null;widget.on('data',function(){var newClasses=this.data.classes,cl;if(previousClasses==newClasses)
return;for(cl in previousClasses){if(!(newClasses&&newClasses[cl]))
this.removeClass(cl);}
for(cl in newClasses)
this.addClass(cl);previousClasses=newClasses;});}
function setupA11yListener(widget){function getLabelDefault(){return this.editor.lang.widget.label.replace(/%1/,this.pathName||this.element.getName());}
widget.on('data',function(){if(!widget.wrapper){return;}
var label=this.getLabel?this.getLabel():getLabelDefault.call(this);widget.wrapper.setAttribute('role','region');widget.wrapper.setAttribute('aria-label',label);},null,null,9999);}
function setupDragHandler(widget){if(!widget.draggable)
return;var editor=widget.editor,container=widget.wrapper.getLast(Widget.isDomDragHandlerContainer),img;if(container)
img=container.findOne('img');else{container=new CKEDITOR.dom.element('span',editor.document);container.setAttributes({'class':'cke_reset cke_widget_drag_handler_container',style:'background:rgba(220,220,220,0.5);background-image:url('+editor.plugins.widget.path+'images/handle.png)'});img=new CKEDITOR.dom.element('img',editor.document);img.setAttributes({'class':'cke_reset cke_widget_drag_handler','data-cke-widget-drag-handler':'1',src:CKEDITOR.tools.transparentImageData,width:DRAG_HANDLER_SIZE,title:editor.lang.widget.move,height:DRAG_HANDLER_SIZE,role:'presentation'});widget.inline&&img.setAttribute('draggable','true');container.append(img);widget.wrapper.append(container);}
widget.wrapper.on('dragover',function(evt){evt.data.preventDefault();});widget.wrapper.on('mouseenter',widget.updateDragHandlerPosition,widget);setTimeout(function(){widget.on('data',widget.updateDragHandlerPosition,widget);},50);if(!widget.inline){img.on('mousedown',onBlockWidgetDrag,widget);if(CKEDITOR.env.ie&&CKEDITOR.env.version<9){img.on('dragstart',function(evt){evt.data.preventDefault(true);});}}
widget.dragHandlerContainer=container;}
function onBlockWidgetDrag(evt){var finder=this.repository.finder,locator=this.repository.locator,liner=this.repository.liner,editor=this.editor,editable=editor.editable(),listeners=[],sorted=[],locations,y;this.repository._.draggedWidget=this;var relations=finder.greedySearch(),buffer=CKEDITOR.tools.eventsBuffer(50,function(){locations=locator.locate(relations);sorted=locator.sort(y,1);if(sorted.length){liner.prepare(relations,locations);liner.placeLine(sorted[0]);liner.cleanup();}});editable.addClass('cke_widget_dragging');listeners.push(editable.on('mousemove',function(evt){y=evt.data.$.clientY;buffer.input();}));editor.fire('dragstart',{target:evt.sender});function onMouseUp(){var l;buffer.reset();while((l=listeners.pop()))
l.removeListener();onBlockWidgetDrop.call(this,sorted,evt.sender);}
listeners.push(editor.document.once('mouseup',onMouseUp,this));if(!editable.isInline()){listeners.push(CKEDITOR.document.once('mouseup',onMouseUp,this));}}
function onBlockWidgetDrop(sorted,dragTarget){var finder=this.repository.finder,liner=this.repository.liner,editor=this.editor,editable=this.editor.editable();if(!CKEDITOR.tools.isEmpty(liner.visible)){var dropRange=finder.getRange(sorted[0]);this.focus();editor.fire('drop',{dropRange:dropRange,target:dropRange.startContainer});}
editable.removeClass('cke_widget_dragging');liner.hideVisible();editor.fire('dragend',{target:dragTarget});}
function setupEditables(widget){var editableName,editableDef,definedEditables=widget.editables;widget.editables={};if(!widget.editables)
return;for(editableName in definedEditables){editableDef=definedEditables[editableName];widget.initEditable(editableName,typeof editableDef=='string'?{selector:editableDef}:editableDef);}}
function setupMask(widget){if(!widget.mask)
return;var img=widget.wrapper.findOne('.cke_widget_mask');if(!img){img=new CKEDITOR.dom.element('img',widget.editor.document);img.setAttributes({src:CKEDITOR.tools.transparentImageData,'class':'cke_reset cke_widget_mask'});widget.wrapper.append(img);}
widget.mask=img;}
function setupParts(widget){if(widget.parts){var parts={},el,partName;for(partName in widget.parts){el=widget.wrapper.findOne(widget.parts[partName]);parts[partName]=el;}
widget.parts=parts;}}
function setupWidget(widget,widgetDef){setupWrapper(widget);setupParts(widget);setupEditables(widget);setupMask(widget);setupDragHandler(widget);setupDataClassesListener(widget);setupA11yListener(widget);if(CKEDITOR.env.ie&&CKEDITOR.env.version<9){widget.wrapper.on('dragstart',function(evt){var target=evt.data.getTarget();if(!Widget.getNestedEditable(widget,target)&&!(widget.inline&&Widget.isDomDragHandler(target)))
evt.data.preventDefault();});}
widget.wrapper.removeClass('cke_widget_new');widget.element.addClass('cke_widget_element');widget.on('key',function(evt){var keyCode=evt.data.keyCode;if(keyCode==13){widget.edit();}else if(keyCode==CKEDITOR.CTRL+67||keyCode==CKEDITOR.CTRL+88){copySingleWidget(widget,keyCode==CKEDITOR.CTRL+88);return;}else if(keyCode in keystrokesNotBlockedByWidget||(CKEDITOR.CTRL&keyCode)||(CKEDITOR.ALT&keyCode)){return;}
return false;},null,null,999);widget.on('doubleclick',function(evt){if(widget.edit()){evt.cancel();}});if(widgetDef.data)
widget.on('data',widgetDef.data);if(widgetDef.edit)
widget.on('edit',widgetDef.edit);}
function setupWidgetData(widget,startupData){var widgetDataAttr=widget.element.data('cke-widget-data');if(widgetDataAttr)
widget.setData(JSON.parse(decodeURIComponent(widgetDataAttr)));if(startupData)
widget.setData(startupData);if(!widget.data.classes)
widget.setData('classes',widget.getClasses());widget.dataReady=true;writeDataToElement(widget);widget.fire('data',widget.data);}
function setupWrapper(widget){var wrapper=widget.wrapper=widget.element.getParent();wrapper.setAttribute('data-cke-widget-id',widget.id);}
function writeDataToElement(widget){widget.element.data('cke-widget-data',encodeURIComponent(JSON.stringify(widget.data)));}
(function(){CKEDITOR.style.addCustomHandler({type:'widget',setup:function(styleDefinition){this.widget=styleDefinition.widget;},apply:function(editor){if(!(editor instanceof CKEDITOR.editor))
return;if(this.checkApplicable(editor.elementPath(),editor))
editor.widgets.focused.applyStyle(this);},remove:function(editor){if(!(editor instanceof CKEDITOR.editor))
return;if(this.checkApplicable(editor.elementPath(),editor))
editor.widgets.focused.removeStyle(this);},checkActive:function(elementPath,editor){return this.checkElementMatch(elementPath.lastElement,0,editor);},checkApplicable:function(elementPath,editor){if(!(editor instanceof CKEDITOR.editor))
return false;return this.checkElement(elementPath.lastElement);},checkElementMatch:checkElementMatch,checkElementRemovable:checkElementMatch,checkElement:function(element){if(!Widget.isDomWidgetWrapper(element))
return false;var widgetElement=element.getFirst(Widget.isDomWidgetElement);return widgetElement&&widgetElement.data('widget')==this.widget;},buildPreview:function(label){return label||this._.definition.name;},toAllowedContentRules:function(editor){if(!editor)
return null;var widgetDef=editor.widgets.registered[this.widget],classes,rule={};if(!widgetDef)
return null;if(widgetDef.styleableElements){classes=this.getClassesArray();if(!classes)
return null;rule[widgetDef.styleableElements]={classes:classes,propertiesOnly:true};return rule;}
if(widgetDef.styleToAllowedContentRules)
return widgetDef.styleToAllowedContentRules(this);return null;},getClassesArray:function(){var classes=this._.definition.attributes&&this._.definition.attributes['class'];return classes?CKEDITOR.tools.trim(classes).split(/\s+/):null;},applyToRange:notImplemented,removeFromRange:notImplemented,applyToObject:notImplemented});function notImplemented(){}
function checkElementMatch(element,fullMatch,editor){if(!editor)
return false;if(!this.checkElement(element))
return false;var widget=editor.widgets.getByElement(element,true);return widget&&widget.checkStyleActive(this);}})();CKEDITOR.plugins.widget=Widget;Widget.repository=Repository;Widget.nestedEditable=NestedEditable;})();