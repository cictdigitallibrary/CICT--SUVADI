<?php

if($_GET)
{
	
    if(array_key_exists('word',$_GET))
    {
        $test_word=$_GET['word'];

        if(is_numeric($test_word))
        {
         $test_word='';
        }
        
    }else{
        $test_word='';
    }
}

if(!isset($sMode)){
	$filters=isset($_REQUEST['filters'])?$_REQUEST['filters']:0;
	$query=isset($_REQUEST['sfind'])?$_REQUEST['sfind']:'';
	$sResult=$mFileHandler->search($query,$filters);
}
if($sResult){
	include_once MOD_PATH."mod_category_1.0.0.php";
	if(!$mCategory)
		$mCategory=new $mCategory();

   
    
    echo "<div id=\"breadcrumb\">";
	echo $_GET['b'].'<strong>&raquo;</strong>'.$_GET['f'].'<strong>&raquo;</strong>'.$_GET['l'];
	//echo " &raquo; ".$sResult[0]['filename'];
	echo "</div>";
	$iTools='';
	$iTools="<div align=\"center\"><input type=\"button\" name=\"iZoomIn\" value=\"பெரிதாக்க(+)\" onClick=\"iZoomIn();\"/>&nbsp;";
	$iTools.="<input type=\"button\" name=\"iNormal\" value=\"இயல்பு(=)\" onClick=\"iNormal();\"/>&nbsp;<input type=\"button\" name=\"iZoomOut\" value=\"சிறிதாக்க(-)\" onClick=\"iZoomOut();\"/></div>";
	echo $iTools;
	echo "<div align=\"center\" id=\"preview\" style=\"margin:10px;width:940px;height:250px;overflow:auto;\">";


	$fileId=$sResult[0]['id'];
	if($sResult[0]['group_id'])
		$fileId=$sResult[0]['group_id'];
	$imageURL=$sResult[0]['cid']."/".$fileId."_".urldecode($sResult[0]['fname']);


	$songs  =$sResult[0]['description'];
	//echo $songs;
		
	if(empty($_GET["word"]))
	{
		
	$lines = explode($sFind,$songs,2);	
	}
	else
	{
	$lines = explode($_GET["word"],$songs,2);							
	}

  /*  echo '<pre>';
    print_r($lines);
    exit;*/
    if(array_key_exists('1',$lines))
    {
        $line2=explode('<br/>',$lines['1']);				

        if(strlen($line2[0])>80)	
            $result = substr($line2[0],0, 500);	
        else
            $result = substr($line2[0],0, 500);
        
    }else{
        $line2=explode('<br/>',$lines['0']);				

        $result = substr($line2[0],0, 500);        
    }
//echo 'result:';
//print_r($lines[0]);

	/*Full Line Display the Array List*/
	$test=array_shift(array_slice($lines,0,1));
	$testing=explode('<br/>',$test);
	$final=end($testing);	
	
	if($fileId)
	{
		if(file_exists(SYS_UPLOADS_PATH."songs/".$imageURL))
		{
			$size=getimagesize(SYS_UPLOADS_PATH."songs/".$imageURL);





					//echo '<pre>Result:';	
					//echo $_GET['sfind'];
					//exit;
					//echo '<pre>Final:';

					//print_r($sFind);
					//exit;
					

	$iWidth=850; $iHeight=200;
	if($size[0]>$iWidth)
		$size[0]=$iWidth;
	if($size[1]>$iHeight)
		$size[1]=$iHeight;
    echo "<div style=\"background-image: url(../images/blank.gif);height:250px; width:940px;\">";
	echo "<img name=\"iFile\" id=\"iFile\" src=\"".WEB_UPLOADS_PATH."songs/".$imageURL."\" alt=\"{$sResult[0]['filename']}\" width=\"{$size[0]}\" height=\"{$size[1]}\" onClick=\"iZoomIn();\" />";
	echo "</div>";
    echo "</div>";
	echo $iTools;
	}


	}
	echo "<table border=\"0\" align=\"center\" style=\"margin:10px auto;\width:80%;\">";
	echo "<tr><th colspan=\"3\"><u>கோப்பின் தகவல்கள்:</u></th></tr>";
	echo "<tr><td><strong> எண்</strong></td><td>:</td><td>{$sResult[0]['fid']}</td></tr>";
/*
	echo "<tr><td><strong>பாடலின் பெயர்</strong></td><td>:</td><td>{$sResult[0]['filename']}</td></tr>";
	echo "<tr><td><strong>உட் பிரிவு</strong></td><td>:</td><td>{$sResult[0]['cname']}</td></tr>";*/
	echo '<br/><br/>';
	//echo "<tr><td><strong>Full Songs:</strong></td><td>:</td><td>{$sResult[0]['description']}</td></tr></table>";
		
	

	if(empty($_GET["word"])&&(!is_numeric($sFind)))
	{
		

	  echo "<tr><td><strong>பாடல்:</strong></td><td>:</td><td>".$lines[0]."<b>".$sFind."</b>".$lines[1]."</td></tr></table>";
	}
	else
	{
        if(array_key_exists('1',$lines))
        {
            echo "<tr><td><strong>பாடல்:</strong></td><td>:</td><td>".$lines[0]."<b>".$test_word."</b>".$lines[1]."</td></tr></table>";

        }else{
            echo "<tr><td><strong>பாடல்:</strong></td><td>:</td><td>".$lines[0]."<b>".$test_word."</b>".$lines[0]."</td></tr></table>";            
        }
	}
	//echo "<tr><td><strong>Full Songs:</strong></td><td>:</td><td>{$sResult[0]['full_songs']}</td></tr></table>";

	$iPrev=($sResult[0]['fid']-1)?($sResult[0]['fid']-1):1;
	$iNext=($sResult[0]['fid']+1);
	echo "<div align=\"center\" style=\"margin:20px;\"><a href=\"search.php?do=view&sfind={$iPrev}&filters={$filters}\" title=\"முந்தய பாடல்\"/><strong>&laquo; முன்</strong></a>&nbsp;&nbsp;&nbsp;<a href=\"search.php?do=view&sfind={$iNext}&filters={$filters}\" title=\"அடுத்த பாடல்\"/><strong>பின் &raquo;</strong></a></div>";
}else{
	$errmsg.="மன்னிக்கவும்; தேடும் பாடல் கிடைக்கப்பெறவில்லை. (No Search Results Found).";
	echo "<a href=\"javascript:void(0);\" onclick=\"javascript:history.back();\">பின் செல்க(Go BACK)</a>";
}
?>
<script language="javascript" type="text/javascript" src="<?php echo WEB_SCRIPTS_PATH;?>iViewer.js"></script>