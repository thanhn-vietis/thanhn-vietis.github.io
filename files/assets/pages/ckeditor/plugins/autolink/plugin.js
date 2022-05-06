(function(){'use strict';var validUrlRegex=/^(https?|ftp):\/\/(-\.)?([^\s\/?\.#-]+\.?)+(\/[^\s]*)?[^\s\.,]$/ig,doubleQuoteRegex=/"/g;CKEDITOR.plugins.add('autolink',{requires:'clipboard',init:function(editor){editor.on('paste',function(evt){var data=evt.data.dataValue;if(evt.data.dataTransfer.getTransferType(editor)==CKEDITOR.DATA_TRANSFER_INTERNAL){return;}
if(data.indexOf('<')>-1){return;}
data=data.replace(validUrlRegex,'<a href="'+data.replace(doubleQuoteRegex,'%22')+'">$&</a>');if(data!=evt.data.dataValue){evt.data.type='html';}
evt.data.dataValue=data;});}});})();