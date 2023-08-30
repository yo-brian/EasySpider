//处理表现层
let nodeList = Array(); //所有新生成的节点全部存储在这里，并且有唯一索引号，所有的定位均通过index进行，即将图保存下来了
let root = {
    index: 0, //在nodeList中的索引号
    id: 0,
    parentId: 0,
    type: -1,
    option: 0,
    title: "root",
    sequence: [],
    parameters: {
        history: 1,
        tabIndex: 0,
        useLoop: false, //是否使用循环中的元素
        xpath: "", //xpath
        iframe: false, //是否在iframe中
        wait: 0, //执行后等待
        waitType: 0, //等待类型，0代表固定时间，1代表随机等待
        beforeJS: "", //执行前执行的js
        beforeJSWaitTime: 0, //执行前js等待时间
        afterJS: "", //执行后执行的js
        afterJSWaitTime: 0, //执行后js等待时间
        waitElement: "", //等待元素
        waitElementTime: 10, //等待元素时间
        waitElementIframeIndex: 0, //等待元素在第几个iframe中
    },
    isInLoop: false, //是否处于循环内
};
nodeList.push(root);
let queue = new Array();
let actionSequence = new Array(); //存储图结构，每个元素为在nodelist里面的索引值，下面的id和pid根据此数组进行索引，然后再在nodelist里找
let nowNode = null; //存储现在所在的节点
let vueData = { nowNodeIndex: 0 }; //存储目前所在节点的索引号,不能直接使用变量而需要用对象包起来
let option = 0; //工具箱选项
let title = "";
let parameterNum = 1; //记录目前的参数个数

// window.resizeTo( screen.availWidth, screen.availHeight );

//处理逻辑层
let app = new Vue({
    el: '#app',
    data: {
        list: { nl: nodeList },
        index: vueData,
        nodeType: 0, // 当前元素的类型
        nowNode: null, // 用来临时存储元素的节点
        codeMode: 0, //代码模式
        loopType: -1, //点击循环时候用来循环选项
        useLoop: false, //记录是否使用循环内元素
        nowArrow: { "position": -1, "pId": 0, "num": 0 },
        paras: { "parameters": [] }, //提取数据的参数列表
        TClass: -1, //条件分支的条件类别
        paraIndex: 0, //当前参数的index
        XPaths: "", //xpath列表
    },
    mounted: function() {
        // setTimeout(function () {
        //     $("#flowchart_graph")[0].scrollTo(0, 10000);
        //     window.scrollTo(0, 10000);
        //     console.log("scroll")
        // }, 500);
    },
    watch: {
        nowArrow: { //变量发生变化的时候进行一些操作
            deep: true,
            handler: function(newVal, oldVal) {
                let arrlist = document.getElementsByClassName("arrow");
                if (oldVal != null) {
                    for (let i = 0; i < arrlist.length; i++) {
                        if (arrlist[i].getAttribute("position") == oldVal["position"] &&
                            arrlist[i].getAttribute("pid") == oldVal["pId"]) {
                            arrlist[i].style.backgroundColor = ""; // 时刻指示现在应该插入的节点的位置
                            break;
                        }
                    }
                }
                for (let i = 0; i < arrlist.length; i++) {
                    if (arrlist[i].getAttribute("position") == newVal["position"] &&
                        arrlist[i].getAttribute("pid") == newVal["pId"]) {
                        arrlist[i].style.backgroundColor = "lavender"; // 时刻指示现在应该插入的节点的位置
                        break;
                    }
                }
            }
        },
        nowNode:{
            deep:true,
            handler: function(newVal, oldVal) {
                updateUI();
            }
        },
        loopType: { //循环类型发生变化的时候更新参数值
            handler: function(newVal, oldVal) {
                this.nowNode["parameters"]["loopType"] = newVal;
            }
        },
        TClass: {
            handler: function(newVal, oldVal) {
                this.nowNode["parameters"]["class"] = newVal;
            }
        },
        useLoop: {
            handler: function(newVal, oldVal) {
                this.nowNode["parameters"]["useLoop"] = newVal;
            }
        },
        paras: {
            handler: function(newVal, oldVal) {
                this.nowNode["parameters"]["paras"] = newVal["parameters"];
            }
        },
        codeMode: {
            handler: function(newVal, oldVal) {
                this.nowNode["parameters"]["codeMode"] = newVal;
                // if(newVal == 3){
                //     this.nowNode["title"] = LANG("退出循环", "Exit Loop");
                // } else if(newVal == 4){
                //     this.nowNode["title"] = LANG("跳过当前循环", "Skip Loop");
                // } else {
                //     this.nowNode["title"] = LANG("自定义操作", "Custom Action");
                // }
            }
        }
    },
    methods: {
        getCookies: function() { //获取cookies
            let command = new WebSocket("ws://localhost:"+getUrlParam("wsport"))
            command.onopen = function() {
                let message = {
                    type: 7, //消息类型，0代表连接操作
                };
                this.send(JSON.stringify(message));
            };
        },
        changeXPaths: function (XPaths){
            let result = "";
            for (let i = 0; i < XPaths.length; i++) {
                result += XPaths[i] + "\n";
            }
            this.XPaths = result;
        },
        addPara: function() { //添加参数
            this.nowNode["parameters"]["paras"].push({
                "nodeType": 0,
                "contentType": 0,
                "relative": false,
                "name": LANG("自定义参数_" + parameterNum.toString(),"Custom_Field_" + parameterNum.toString()),
                "desc": "",
                "extractType": 0,
                "relativeXPath": "//body",
                "recordASField": 1,
                "allXPaths": [],
                "exampleValues": [
                    {
                        "num": 0,
                        "value": LANG("自定义值", "Custom_Value")
                    }
                ],
                "default": "",
                "beforeJS": "",
                "beforeJSWaitTime": 0,
                "JS": "",
                "JSWaitTime": 0,
                "afterJS": "",
                "afterJSWaitTime": 0,
                "downloadPic": 0,
                "paraType": "text",
            });
            notifyParameterNum(1);
            this.paraIndex = this.nowNode["parameters"]["paras"].length - 1;
            setTimeout(function(){$("#app > div.elements > div.toolkitcontain > table.toolkittb4 > tbody > tr:last-child")[0].scrollIntoView(false); //滚动到底部
            }, 200);
        },
        modifyParas: function(i) { //修改第i个参数
            this.paraIndex = i;
            console.log(this.paras);
        },
        deleteParas: function(i) { //删除第i个参数
            this.nowNode["parameters"]["paras"].splice(i, 1);
            //如果参数删除完了，就把提取数据也删掉
            if (this.nowNode["parameters"]["paras"].length == 0) {
                deleteElement();
            }
        },
        upParas: function(i) { //上移第i个参数
            if (i != 0) {
                let t = this.nowNode["parameters"]["paras"].splice(i, 1)[0];
                this.nowNode["parameters"]["paras"].splice(i - 1, 0, t);
            }
        },
        downParas: function(i) { //下移第i个参数
            if (i != this.nowNode["parameters"]["paras"].length - 1) {
                let t = this.nowNode["parameters"]["paras"].splice(i, 1)[0];
                this.nowNode["parameters"]["paras"].splice(i + 1, 0, t);
            }
        },

        getType: function(nodeType, contentType) { //根据类型得到字段名称
            if (contentType == 2) {
                return "InnerHTML";
            } else if (contentType == 3) {
                return "OuterHTML";
            }
            if (nodeType == 2) {
                return LANG("链接地址", "Link Address");
            } else if (nodeType == 1) {
                return LANG("链接文本","Link Text");
            } else if (nodeType == 4) {
                return LANG("图片地址","Image Address");
            } else {
                return LANG("文本","Text");
            }
        }
    }
})

//深复制
function DeepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    let cpObj = obj instanceof Array ? [] : {};
    for (let key in obj) cpObj[key] = DeepClone(obj[key]);
    return cpObj;
}

// 根据元素类型返回不同元素的样式
function newNode(node) {
    id = node["id"];
    title = node["title"];
    type = node["type"];
    if (type == 0) //顺序
    {
        return `<div class="sequence"><div class="node clk" draggable="true" data="${id}" dataType=${type} id = "${id}" position=${node["position"]} pId=${node["parentId"]}>
                <div >
                    <p>${title}</p>
                </div>
            </div>
            <p class="arrow" draggable="true" position=${node["position"]} data = "${id}" pId=${node["parentId"]}>↓</p></div>`;
    } else if (type == 1) //循环
    {
        return `<div class="loop clk" data="${id}" draggable="true" dataType=${type} id = "${id}" position=${node["position"]} pId=${node["parentId"]}>
             <p style="background:#d6d6d6;text-align:left;padding:2px">${title}</p>
                <p class="arrow" draggable="true" position=-1 data = "${id}" pId=${id}>↓</p>
            </div>
            <p class="arrow" draggable="true" data = "${id}" position=${node["position"]} pId=${node["parentId"]}>↓</p></div>`;
    } else if (type == 2) //判断
    {
        return LANG(`<div class="loop clk" draggable="true" dataType=${type} data="${id}" position=${node["position"]} pId=${node["parentId"]}>
                    <p style="background:#d6d6d6;text-align:left;padding:2px">${title}</p>
                    <p class="branchAdd" data="${id}">点击此处在最左边增加条件分支</p>
                    <div class="judge" id = "${id}">
                    </div></div>
                    <p class="arrow" draggable="true" data = "${id}" position=${node["position"]} pId=${node["parentId"]}>↓</p></div>`,
            `<div class="loop clk" draggable="true" dataType=${type} data="${id}" position=${node["position"]} pId=${node["parentId"]}>
                    <p style="background:#d6d6d6;text-align:left;padding:2px">${title}</p>
                    <p class="branchAdd" data="${id}">Click here to add a new condition to the left most</p>
                    <div class="judge" id = "${id}">
                    </div></div>
                    <p class="arrow" draggable="true" data = "${id}" position=${node["position"]} pId=${node["parentId"]}>↓</p></div>`);
    } else //判断分支
    {
        return `<div class="branch clk" dataType=${type} data="${id}" position=${node["position"]} pId=${node["parentId"]}>
                    <p style="background:#d6d6d6;text-align:left;padding:2px">${title}</p>
                    <p data = "${id}" class="arrow" draggable="true" position=-1 pId=${id}>↓</p>
                    <div id = "${id}">
                    </div></div>`;
    }
}



function branchMouseDown(e) {
    if (e.button == 2) //右键点击
    {
        let judgeId = this.getAttribute('data');
        let l = nodeList.length;
        let t = {
            index: l,
            id: 0,
            parentId: 0,
            type: 3,
            option: 10,
            title: LANG("条件分支", "Condition"),
            sequence: [],
            isInLoop: false,
        };
        addParameters(t)
        nodeList.push(t);
        nodeList[actionSequence[judgeId]]["sequence"].splice(0, 0, t.index);
        refresh();
        app._data.nowArrow = { "position": -1, "pId": t["id"], "num": 0 };
        $("#" + t["id"]).click();
    }
    e.stopPropagation(); //防止冒泡
}

function arrowMouseDown(e) {
    if (e.button == 2) //右键点击
    {
        if (option != 0) {
            app._data.nowArrow = { "position": this.getAttribute('position'), "pId": this.getAttribute('pId'), "num": 0 };
        }
        toolBoxKernel(e);
    }
}
//增加分支点击事件
function branchClick(e) {
    let judgeId = this.getAttribute('data');
    let l = nodeList.length;
    let t = {
        index: l,
        id: 0,
        parentId: 0,
        type: 3,
        option: 10,
        title: LANG("条件分支", "Condition"),
        sequence: [],
        isInLoop: false,
    };
    addParameters(t);
    nodeList.push(t);
    nodeList[actionSequence[judgeId]]["sequence"].splice(0, 0, t.index);
    refresh();
    app._data.nowArrow = { "position": -1, "pId": t["id"], "num": 0 };
    $("#" + t["id"]).click();
    e.stopPropagation(); //防止冒泡
}

function elementMousedown(e) {
    if (e.button == 2) //右键点击
    {
        try{
            document.getElementById("contextMenu").remove();
        } catch {

        }
        if (nowNode != null) {
            nowNode.style.borderColor = "skyblue";
        }
        nowNode = this;
        vueData.nowNodeIndex = actionSequence[this.getAttribute("data")];
        this.style.borderColor = "blue";
        handleElement(); //处理元素
    }
    e.stopPropagation(); //防止冒泡
}

//元素点击事件
function elementClick(e) {
    try{
        document.getElementById("contextMenu").remove();
    } catch (e) {

    }
    if (nowNode != null) {
        nowNode.style.borderColor = "skyblue";
    }
    nowNode = this;
    vueData.nowNodeIndex = actionSequence[this.getAttribute("data")];
    this.style.borderColor = "blue";
    handleElement(); //处理元素
    e.stopPropagation(); //防止冒泡
}

//箭头点击事件
function arrowClick(e) {
    if (option != 0) {
        app._data.nowArrow = { "position": this.getAttribute('position'), "pId": this.getAttribute('pId'), "num": 0 };
    }
    toolBoxKernel(e);
}

//增加元素函数
function addElement(op, para) {
    option = op;
    if (option == 1) { //打开网页选项
        title = LANG("打开网页", "Open Page");
    } else {
        title = $(".options")[option - 1].innerHTML; //获取新增操作名称
    }

    toolBoxKernel(null, para);
}

// 工具箱操作函数
function toolBoxKernel(e, para = null) {
    if (option == 13) { //调整锚点
        // let tarrow = DeepClone(app.$data.nowArrow);
        // refresh();
        // app._data.nowArrow =tarrow;
    } else if (option == 11) { //复制操作
        if (nowNode == null) {
            e.stopPropagation(); //防止冒泡
        } else if (nowNode.getAttribute("dataType") > 0) {
            showError(LANG("循环和判断、条件分支不可复制！", "Cannot copy loop, if and condition!"));
            e.stopPropagation(); //防止冒泡
        } else {
            let position = parseInt(nowNode.getAttribute('position'));
            let pId = nowNode.getAttribute('pId');
            let tt = nodeList[nodeList[actionSequence[pId]]["sequence"][position]]; //在相应位置添加新元素
            t = DeepClone(tt); //浅复制元素
            let l = nodeList.length;
            t.index = l;
            nodeList.push(t);
            let position2 = parseInt(app._data.nowArrow['position']);
            let pId2 = app._data.nowArrow['pId'];
            nodeList[actionSequence[pId2]]["sequence"].splice(position2 + 1, 0, t.index); //在相应位置添加新元素
            refresh(); //重新渲染页面
            app._data.nowArrow = { "position": t["position"], "pId": t["parentId"], "num": 0 };
            $("#" + t["id"]).click(); //复制后点击复制后的元素
            e.stopPropagation(); //防止冒泡
        }
    } else if (option == 10) { //剪切操作
        if (nowNode == null) {
            e.stopPropagation(); //防止冒泡
        } else if ($(nowNode).is(".branch")) {
            showError(LANG("判断分支不可移动！", "Cannot move condition branch!"));
            e.stopPropagation(); //防止冒泡
        } else {
            let position = parseInt(nowNode.getAttribute('position'));
            let pId = nowNode.getAttribute('pId');
            let position2 = parseInt(app._data.nowArrow['position']);
            let pId2 = app._data.nowArrow['pId'];
            let id = nowNode.getAttribute('data');
            let pidt = pId2;
            let move = true;
            console.log(pidt, id);
            while (pidt != 0) {
                if (pidt == id) {
                    move = false;
                    break;
                }
                pidt = nodeList[actionSequence[pidt]]["parentId"];
            }
            if (move) //如果自己要移动到自己节点里就不允许移动
            {
                let element = nodeList[actionSequence[pId]]["sequence"].splice(position, 1); //在相应位置删除元素
                if (pId == pId2 && position < position2) //如果要移动的位置属于同一层并且是从前往后移动，注意需要控制数组插入位置向前错位
                {
                    position2--;
                }
                // console.log(element);
                nodeList[actionSequence[pId2]]["sequence"].splice(position2 + 1, 0, element[0]); //在相应位置添加新元素
                refresh(); //重新渲染页面
                // console.log(nodeList[element[0]]);
                app._data.nowArrow = { "position": nodeList[element[0]]["position"], "pId": nodeList[element[0]]["parentId"], "num": 0 };
                $("#" + nodeList[element[0]]["id"]).click();
            } else {
                showError(LANG("自己不能移动到自己的节点里！", "Cannot move inside self!"));
            }
            e.stopPropagation(); //防止冒泡
        }
    } else if (option > 0) { //新增操作
        let l = nodeList.length;
        let nt = null;
        let nt2 = null;
        let t = {
            id: 0,
            index: l,
            parentId: 0,
            type: 0,
            option: option,
            title: title,
            sequence: [],
            isInLoop: false,
        };
        nodeList.push(t);
        if (option == 8) //循环
        {
            t["type"] = 1;
        } else if (option == 9) //判断
        {
            t["type"] = 2;
            // 增加两个分支
            nt = {
                id: 0,
                parentId: 0,
                index: l + 1,
                type: 3,
                option: 10,
                title: LANG("条件分支", "Condition"),
                sequence: [],
                isInLoop: false,
            };
            nt2 = {
                id: 0,
                parentId: 0,
                index: l + 2,
                type: 3,
                option: 10,
                title: LANG("条件分支", "Condition"),
                sequence: [],
                isInLoop: false,
            };
            t["sequence"].push(nt.index);
            t["sequence"].push(nt2.index);
            nodeList.push(nt)
            nodeList.push(nt2);
            addParameters(nt); //增加选项的默认参数
            addParameters(nt2); //增加选项的默认参数
        }
        let position = parseInt(app._data.nowArrow['position']);
        let pId = app._data.nowArrow['pId'];
        nodeList[actionSequence[pId]]["sequence"].splice(position + 1, 0, t.index); //在相应位置添加新元素
        refresh(); //重新渲染页面
        //下面是确定添加元素之后下一个要插入的节点的位置
        app._data.nowArrow = { "position": t["position"], "pId": t["parentId"], "num": 0 };
        addParameters(t); //增加选项的默认参数
        if (para != null) {
            modifyParameters(t, para);
        }
        if (option == 8) //循环情况下应插入在循环里面
        {
            app._data.nowArrow = { "position": -1, "pId": t["id"], "num": 0 };
            $("#" + t["id"]).click();
        } else if (option == 9) //判断插入到第一个判断条件中
        {
            app._data.nowArrow = { "position": -1, "pId": nt["id"], "num": 0 };
            $("#" + nt["id"]).click();
        } else {
            $("#" + t["id"]).click();
        }

        if (e != null)
            e.stopPropagation(); //防止冒泡
        option = 0;
        return t;
    }
    option = 0;

}

$(".options").mousedown(function() {
    option = parseInt(this.getAttribute("data"));
    title = this.innerHTML;
    if (option >= 10 && option <= 12 && (nowNode == null || nowNode.getAttribute("id") == 0)) {
        showError(LANG("目前未选中元素。", "No element selected。"));
    } else if (option == 12) {
        deleteElement();
        $(".options")[12].click();
    }
});

function arrowDragOver(e) {
    e.preventDefault();
    app._data.nowArrow = { "position": this.getAttribute('position'), "pId": this.getAttribute('pId'), "num": 0 };
    // console.log("dragover", app._data.nowArrow, nowNode);
}

function elementDragEnd(e) {
    // e.preventDefault();
    // console.log("dragend");
    if (nowNode != null) {
        nowNode.style.borderColor = "skyblue";
    }
    nowNode = this;
    vueData.nowNodeIndex = actionSequence[this.getAttribute("data")];
    this.style.borderColor = "blue";
    handleElement(); //处理元素
    option = 10; //剪切元素操作
    toolBoxKernel.call(this, e);
    e.stopPropagation();
}

function arrowDblClick(e) {
    option = 13; //调整锚点操作
    app._data.nowArrow = { "position": this.getAttribute('position'), "pId": this.getAttribute('pId'), "num": 0 };
    toolBoxKernel.call(this, e);
    e.stopPropagation();
}

function arrowDragEnd(e) {
    option = 13; //调整锚点操作
    toolBoxKernel.call(this, e);
    e.stopPropagation();
}

function optionDragEnd(e) {
    option = parseInt(this.getAttribute("data"));
    toolBoxKernel.call(this, e);
    e.stopPropagation();
}

function bindEvents() {
    // 清空原来的listener然后再添加新的listener
    //以下绑定了左右键的行为
    let rect = document.getElementsByClassName('clk');
    for (let i = 0, rule; rule = rect[i++];) {
        rule.removeEventListener('mousedown', elementMousedown);
        rule.addEventListener('mousedown', elementMousedown);
        rule.removeEventListener('click', elementClick);
        rule.addEventListener('click', elementClick);
        rule.removeEventListener('dragend', elementDragEnd);
        rule.addEventListener('dragend', elementDragEnd);
    }
    let arr = document.getElementsByClassName('arrow');
    for (let i = 0, rule; rule = arr[i++];) {
        rule.removeEventListener('click', arrowClick);
        rule.addEventListener('click', arrowClick);
        rule.removeEventListener('mousedown', arrowMouseDown);
        rule.addEventListener('mousedown', arrowMouseDown);
        rule.removeEventListener('dblclick', arrowDblClick);
        rule.addEventListener('dblclick', arrowDblClick);
        rule.removeEventListener('dragover', arrowDragOver);
        rule.addEventListener('dragover', arrowDragOver);
        rule.removeEventListener('dragend', arrowDragEnd);
        rule.addEventListener('dragend', arrowDragEnd);
    }
    let branch = document.getElementsByClassName('branchAdd');
    for (let i = 0, rule; rule = branch[i++];) {
        rule.removeEventListener('click', branchClick);
        rule.addEventListener('click', branchClick);
        rule.removeEventListener('mousedown', branchMouseDown);
        rule.addEventListener('mousedown', branchMouseDown);
    }
    let options = document.getElementsByClassName("options");
    for (let i = 0, rule; rule = options[i++];) {
        rule.removeEventListener('dragend', optionDragEnd);
        rule.addEventListener('dragend', optionDragEnd);
    }
}

//重新画图
function refresh(nowArrowReset = true) {
    $("#0").empty();
    $("#0").append(`<div style="border-radius: 50%;width: 40px;height: 40px;border:solid;border-color:seagreen;margin:5px auto;background-color:lightcyan;margin-top:20px">
                        <p style="font-size: 24px!important;text-align: center;margin-left: 6px;font-family:'Times New Roman'">▶</p>
                        </div>
                        <p id="firstArrow" class="arrow" position=-1 pId=0>↓</p>`);
    actionSequence.splice(0);
    queue.splice(0);
    let idd = 1;
    queue.push(0);
    actionSequence.push(0);
    while (queue.length != 0) {
        let nd = queue.shift(); //取出父元素并建立对子元素的链接
        for (let i = 0; i < nodeList[nd].sequence.length; i++) {
            nodeList[nodeList[nd].sequence[i]].parentId = nodeList[nd].id;
            nodeList[nodeList[nd].sequence[i]]["position"] = i;
            nodeList[nodeList[nd].sequence[i]].id = idd++;
            //检测元素是否位于循环内
            if (nodeList[nd].option == 8 || nodeList[nd].isInLoop) {
                nodeList[nodeList[nd].sequence[i]].isInLoop = true;
            } else {
                nodeList[nodeList[nd].sequence[i]].isInLoop = false;
            }
            queue.push(nodeList[nd].sequence[i]);
            actionSequence.push(nodeList[nd].sequence[i]);
        }
    }
    if (nowArrowReset) //如果要重置锚点位置
    {
        app._data.nowArrow = { "position": nodeList[0].sequence.length - 1, "pId": 0, "num": 0 }; //设置默认要添加的位置是元素流程最开头处
    }
    //第一个元素不渲染
    for (let i = 1; i < actionSequence.length; i++) {
        let parentId = nodeList[actionSequence[i]]["parentId"];
        $("#" + parentId).append(newNode(nodeList[actionSequence[i]]));
    }
    bindEvents();
}

function deleteElement() {
    if (nowNode == null || nowNode.getAttribute("id") == 0) {
        showError(LANG("当前未选中元素!", "No element is selected now!"));
        return;
    }
    // if (nodeList[actionSequence[nowNode.getAttribute("data")]]["option"] == 1) {
    //     showError("打开网页操作不可删除！");
    //     return;
    // }
    let position = parseInt(nowNode.getAttribute('position'));
    let pId = nowNode.getAttribute('pId');
    let tnode = nodeList[actionSequence[pId]]["sequence"].splice(position, 1); //在相应位置删除元素
    //循环的标记已经被删除的元素，因为删除循环后，循环内的元素也会
    let queue = new Array();
    queue.push(tnode[0]);
    while (queue.length > 0) {
        let index = queue.shift();
        nodeList[index]["id"] = -1; //标记服务已被删除
        for (let i = 0; i < nodeList[index]["sequence"].length; i++) {
            queue.push(nodeList[index]["sequence"][i]);
        }
    }
    app._data["nowNode"] = null;
    app._data["nodeType"] = 0;
    vueData.nowNodeIndex = 0;
    if (nowNode.getAttribute("datatype") == 3) { //如果删掉的是条件分支的话
        pId = nowNode.parentNode.parentNode.getAttribute('pId');
        position = nowNode.parentNode.parentNode.getAttribute('position');
    }
    app.$data.nowArrow = { position: position - 1, "pId": pId, "num": 0 }; //删除元素后锚点跳转到当前元素的上一个节点
    refresh(false); //重新渲染页面
    nowNode = null; //取消选择
}

document.oncontextmenu = function() {
        // 创建一个包含删除选项的右键菜单
        let contextMenu = document.createElement("div");
        contextMenu.id = "contextMenu";
        contextMenu.innerHTML = `<div>${LANG("删除元素", "Delete Element")}`;

        // 设置右键菜单的样式
        contextMenu.style.position = "absolute";
        contextMenu.style.left = event.clientX + "px";
        contextMenu.style.top = event.clientY + "px";
        contextMenu.style.width = LANG("140px", "180px");

        // 添加删除元素的功能
        contextMenu.addEventListener("click", function() {
            // myElement.remove(); // 删除元素
            deleteElement();
            contextMenu.remove(); // 删除右键菜单
        });

        // 将右键菜单添加到文档中
        document.body.appendChild(contextMenu);
    } //屏蔽右键菜单
    //删除元素


function inputDelete(e) {
    if (e.keyCode == 46) {
        e.stopPropagation(); //输入框按delete应该正常运行
        //Electron中如果有showError或者confirm，执行后会卡死输入框，所以最好不要用
    }
}
