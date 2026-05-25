<?php
/*
Module Name:	Category Manager
Module Author:	AMS
Module Members:	tableName
Module Properties:	
Module Methods:	add, remove, delete, update
Module Version:	1.0.0
Module Date:	2010-04-26
Module Description:	To manage categories and sub-categories using Adjucency Model
Module Help URL:	http://www.example.com/categories/
*/
require_once DB_PATH."db_main_1.0.0.php";
class Category extends MainDB{
	var $tableName;
	function __construct(){
		$this->tableName=TABLE_PREFIX."sub_category";
	}
	
	function add($cname, $parent=0){
		// adds a new node on existing category
		global $link;
		$sql.="INSERT INTO ".$this->tableName." (cname, pid) VALUES('{$cname}','{$parent}')";
		$res=mysql_query($sql);
		if(!$res){
			echo "Adding New Category failed.";
		return false;
		}
	return true;
	}
	
	function remove(&$id,&$leaveChild=FALSE){
		// alias to delte
		$this->delete($id,$leaveChild);
	}
	
	function delete($id,$leaveChild=FALSE){
		// removes/deletes an existing node of category
		global $link;
		$sql="UPDATE ".$this->tableName." SET trash=1 WHERE id={$id}";
		$res=mysql_query($sql);
		if(!$res){
			echo "Deleting a Node Failed.";
		return false;
		}
	return mysql_affected_rows();
	}
	function unDelete($id){
		// removes/deletes an existing node of category
		global $link;
		$sql="UPDATE ".$this->tableName." SET trash=0 WHERE id={$id}";
		$res=mysql_query($sql);
		if(!$res){
			echo "Undo of Deleted Node Failed.";
		return false;
		}
	return mysql_affected_rows();
	}
	function vlist($parent=0, $level=0){
		// retrieve full tree of a node upto the depth
		global $link;
		$sql="SELECT id, cname, pid, description FROM ".$this->tableName." where pid={$parent} and trash=0";
		$res=mysql_query($sql);
		if(!$res){
			echo "List View Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_assoc($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}

	function getSearchAllBooks(){
		  
		  	$q=mysql_query("SELECT book_id,name FROM sv_book where status='1' order by book_id desc");
		    if(!mysql_num_rows($q)){
		        return;
			}
			
			$plist=array();
		    
		    while($arr=mysql_fetch_assoc($q))
		    {
				echo "<option value=\"".$arr['book_id']."\">";
				echo $arr['name']."</option>";
				$plist[]=$arr;
		    }
			
			return $plist;
	}
	
	function getAllMainCategories(){
		  	$q=mysql_query("SELECT cid,cname FROM sv_main_category order by cid");
		    if(!mysql_num_rows($q)){
		        return;
			}
			$plist=array();
		    while($arr=mysql_fetch_assoc($q))
		    {
				if($arr['cid']==$selected)
					echo "<option value=\"".$arr['cid']."\" selected=\"selected\">";
				else
					echo "<option value=\"".$arr['cid']."\">";
				echo $arr['cname']."</option>";
				$plist[]=$arr;
		    }
		return $plist;
	}

	function getAllSubCategories($parent){
	  	$q=mysql_query("SELECT id,cname,pid FROM ".$this->tableName." WHERE pid={$parent} and trash=0 order by id");
	    if(!mysql_num_rows($q)){
	        return;
		}
		
	    while($arr=mysql_fetch_assoc($q))
	    {
			echo "<option value=\"".$arr['id']."\">".$arr['cname']."</option>";
	    }
	}
	function getSubCategoryJSON($parent){
	  	$q=mysql_query("SELECT id,cname,pid FROM ".$this->tableName." WHERE pid={$parent} and trash=0 order by id");
	    if(!mysql_num_rows($q) OR $parent==0){
		echo "[{\"optionValue\":\"0\",\"optionDisplay\":\"--சுவடியைத் தேர்வு செய்யவும்--\"}]";
	        return;
		}
		echo "[{\"optionValue\":\"0\",\"optionDisplay\":\"--சுவடியைத் தேர்வு செய்யவும்--\"}";
	    while($arr=mysql_fetch_assoc($q))
	    {
			echo ",{\"optionValue\":\"".$arr['id']."\",\"optionDisplay\":\"".$arr['cname']."\"}";
	    }
		echo "]";
	}
	function getAllRoots($parent=0){
	  	$q=mysql_query("SELECT id,cname,pid FROM ".$this->tableName." WHERE pid={$parent} and trash=0 order by id");
	    if(!mysql_num_rows($q)){
	        return;
		}
		$plist=array();
	    while($arr=mysql_fetch_assoc($q))
	    {
			if($arr['id']==$selected)
				echo "<option value=\"".$arr['id']."\" selected=\"selected\">";
			else
				echo "<option value=\"".$arr['id']."\">";
			echo $arr['cname']."</option>";
			$plist[]=$arr;
	    }
	return $plist;
	}
	function tree_viewed($parent,$selected=0,$depth=0,$main_category_only=false)
	{
    	$q=mysql_query("SELECT id,cname,pid FROM ".$this->tableName." WHERE pid={$parent} and trash=0 order by id");
	    if(!mysql_num_rows($q)){
	        return;
		}
		$depth++;
	    while($arr=mysql_fetch_assoc($q))
	    {
			if($arr['id']==$selected)
				echo "<option value=\"".$arr['id']."\" selected=\"selected\">";
			else
				echo "<option value=\"".$arr['id']."\">";
			if($depth>1)
		       echo str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;|',$depth-1)."__".$arr['cname'];
		else
				echo $arr['cname'];
			echo "</option>";
			if(!$main_category_only)
	        $this->tree_viewed($arr['id'],$selected,$depth);
	    }
		$depth--;
	}

	function tree_view($parent,$selected=0,$depth=0)
	{

    	$q=mysql_query("SELECT sv_sub_category.id,sv_book.NAME AS book,sv_main_category.cname,sv_sub_category.sub_cat_name FROM sv_sub_category
				LEFT JOIN sv_main_category ON  sv_main_category.cid=sv_sub_category.main_category_id
				LEFT JOIN sv_book ON  sv_book.book_id=sv_main_category.book_id
				WHERE sv_sub_category.STATUS='1' AND sv_book.STATUS='1'AND sv_main_category.STATUS='1'
				ORDER BY sv_sub_category.id desc");

	    if(!mysql_num_rows($q)){
	        return;
		}

		$depth++;

	    while($arr=mysql_fetch_assoc($q))
	    {
			
			echo "<option value=\"".$arr['id']."\">".$arr['book'].'-'.$arr['cname'].'-'.$arr['sub_cat_name'];
			echo "</option>";
	    }
		$depth--;
	}

	function tree_view_menu($parent,$depth=0)
	{
    	$q=mysql_query("SELECT id,cname,pid FROM ".$this->tableName." WHERE pid={$parent} and trash=0 order by id");
	    if(!mysql_num_rows($q)){
	        return;
		}
		$depth++;
		echo "<ul>\n";
	    while($arr=mysql_fetch_assoc($q))
	    {
			echo "<li><a href=\"#\">".$arr['cname']."</a>";
	        $this->tree_view_menu($arr['id'],$depth);
			echo "</li>\n";
	    }
		echo "</ul>\n";
		$depth--;
	}
	function update($id, $cname){
		// update category data
		if(empty($id))
			return false;
		global $link;
		$sql="UPDATE ".$this->tableName." SET cname='{$cname}' WHERE id={$id}";
		$res=mysql_query($sql);
		if(!$res){
			echo "Update failed.";
		return false;
		}
	return mysql_affected_rows();
	}
	function leafNodes(){
		// finds all leaf node for a parent node
		global $link;
		$sql="";
		$res=mysql_query($sql);
		if(!$res){
			echo "Leaf Nodes Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	/*function singlePath($parent){
		// retrieve a single path for a node
		if(empty($parent))
			return false;
		global $link;
		$sql="SELECT id,cname,pid FROM ".$this->tableName." WHERE id={$parent} AND trash=0";
		$res=mysql_query($sql);
		if(!$res){
			echo "Single Path Retrival Failed.";
		return false;
		}
		while($data=mysql_fetch_row($res)){
			$this->singlePath($data[2]);
			echo " <strong>&raquo;</strong> ".$data[1];
		}
	return;
	}
	*/

	function nodeDepth(){
		// get a list of node depth with count
		global $link;
		$sql="";
		$res=mysql_query($sql);
		if(!$res){
			echo "Node Depth Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	
	function subtreeDepth($id){
		// find depth of a sub-tree
		global $link;
		$sql="";
		
		$res=mysql_query($sql);
		if(!$res){
			echo "Subtree Depth Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	
	function immediateSubroutine($id){
		// find immediate sub-routine of a Node
		global $link;
		$sql="";
		$res=mysql_query($sql);
		if(!$res){
			echo "Immediate Subroutine Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}

}

?>