const { User_Data_Model } = require(process.cwd() + "/database/verden");



const roles = {
    "mayor":["*"],
    "developer":["*"],
    "manage_user_data":["citizens_manage"],
    "tasks_manager":["task_manage"],
    "tasks_creator":["task_create"], 
    "citizen":[]
}

const is_citizen = async (uuid) => {
 
    const user_data = await User_Data_Model.findOne({ player_uuid: uuid });
    console.log(uuid)
    if (user_data == undefined)
        return false; 
  
    if (!user_data.roles.includes("citizen") && !user_data.roles.includes("mayor")  && !user_data.roles.includes("developer"))
        return false;
    return true;
}
 
 
 
 
async function check_for_permission(permission,player_uuid){
    const user_data = await User_Data_Model.findOne({ player_uuid });
   
    if(!user_data) return false;
    var has = false;  
    for (let index = 0; index < user_data.roles.length; index++) {
        const role = user_data.roles[index]; 
        if(!roles[role])continue;
        has = roles[role].includes(permission) || roles[role].includes("*") ;
        if(has) break;
    }
    return has;
 
}
 
async function user_permissions( player_uuid){
    const user_data = await User_Data_Model.findOne({ player_uuid });
    var permissions = [];
    for (let index = 0; index < user_data.roles.length; index++) {
        const role = user_data.roles[index];  
        if(!roles[role])continue;
        for (let index = 0; index < roles[role].length; index++) {
            const role_permission = roles[role][index]; 
            if(!permissions.includes(role_permission))permissions.push(role_permission)
        }
    }
    return permissions;
 
}

module.exports = {check_for_permission,user_permissions,is_citizen,roles}